const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in the backend .env file.");
  process.exit(1);
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Helper: Make HTTP request using native https module
function makeRequest(url, method, headers, bodyData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        ...headers
      }
    };

    if (bodyData) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request(options, (res) => {
      // For file download, we want a buffer, for listing we want string
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: buffer
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

// Recursive list files inside Supabase bucket
async function crawlBucket(prefix = "") {
  let allFiles = [];
  let offset = 0;
  const limit = 100;

  console.log(`🔍 Scanning storage directory: "${prefix || '/'}"...`);

  while (true) {
    const listUrl = `${supabaseUrl}/storage/v1/object/list/mc-attachments`;
    const payload = JSON.stringify({
      prefix: prefix,
      limit: limit,
      offset: offset,
      sortBy: { column: 'name', order: 'asc' }
    });

    try {
      const response = await makeRequest(listUrl, 'POST', { 'Content-Type': 'application/json' }, payload);
      
      if (response.statusCode !== 200) {
        console.error(`❌ Failed to list files. Status: ${response.statusCode}`, response.data.toString());
        break;
      }

      const items = JSON.parse(response.data.toString());
      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      for (const item of items) {
        // If id is null, it's a folder/directory placeholder
        if (item.id === null || !item.metadata) {
          const subfolderPrefix = prefix ? `${prefix}${item.name}/` : `${item.name}/`;
          const subfolderFiles = await crawlBucket(subfolderPrefix);
          allFiles = allFiles.concat(subfolderFiles);
        } else {
          const filePath = prefix ? `${prefix}${item.name}` : item.name;
          allFiles.push({
            name: filePath,
            size: item.metadata.size,
            mimetype: item.metadata.mimetype
          });
        }
      }

      if (items.length < limit) {
        break;
      }
      offset += limit;
    } catch (err) {
      console.error(`❌ Error scanning path "${prefix}":`, err.message);
      break;
    }
  }

  return allFiles;
}

// Download a single file
async function downloadFile(supabaseFilePath) {
  // Supabase storage object path must be URI encoded
  const encodedPath = supabaseFilePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const downloadUrl = `${supabaseUrl}/storage/v1/object/authenticated/mc-attachments/${encodedPath}`;

  try {
    const response = await makeRequest(downloadUrl, 'GET', {});
    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(`Status ${response.statusCode}`);
    }
  } catch (err) {
    console.error(`❌ Error downloading "${supabaseFilePath}":`, err.message);
    return null;
  }
}

async function runRestore() {
  console.log("☁️ Connecting to Supabase Storage...");
  try {
    const files = await crawlBucket("");
    console.log(`\n📦 Found ${files.length} total files in Supabase Storage.`);

    let successCount = 0;
    let skippedCount = 0;
    let failCount = 0;

    for (const file of files) {
      // Local path setup
      const localFilePath = path.join(uploadsDir, file.name);
      const localSubdir = path.dirname(localFilePath);

      // Create folders locally if they don't exist
      if (!fs.existsSync(localSubdir)) {
        fs.mkdirSync(localSubdir, { recursive: true });
      }

      // Check if file already exists locally
      if (fs.existsSync(localFilePath)) {
        const stats = fs.statSync(localFilePath);
        // If size is close enough, skip download
        if (stats.size === file.size) {
          skippedCount++;
          continue;
        }
      }

      console.log(`⬇️ Downloading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
      const fileData = await downloadFile(file.name);
      if (fileData) {
        fs.writeFileSync(localFilePath, fileData);
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`\n🎉 Uploads Restoration completed!`);
    console.log(`- Restored/Downloaded: ${successCount} files`);
    console.log(`- Up-to-date (Skipped): ${skippedCount} files`);
    if (failCount > 0) {
      console.log(`- Failed: ${failCount} files`);
    }
  } catch (err) {
    console.error("❌ Restore uploads process failed:", err);
  }
}

runRestore();
