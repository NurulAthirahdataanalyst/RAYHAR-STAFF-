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

const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Resolves a remote storage object name safely inside `uploadsDir` using
 * `path.basename()` on every segment and verifying containment (CWE-23).
 */
function resolveSafeUploadPath(rawFileName) {
  if (!rawFileName || typeof rawFileName !== 'string') {
    return null;
  }

  const trimmed = rawFileName.trim();
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('..') || trimmed.includes('\\')) {
    return null;
  }

  const safeBaseName = path.basename(trimmed);
  if (!safeBaseName || safeBaseName === '.' || safeBaseName === '..') {
    return null;
  }

  const rawDir = path.dirname(trimmed);
  const safeSubdirName =
    rawDir && rawDir !== '.' && rawDir !== '/' ? path.basename(rawDir) : '';

  if (safeSubdirName === '.' || safeSubdirName === '..') {
    return null;
  }

  // Reject multi-level paths where dirname had more than one segment
  const expectedRelative = safeSubdirName ? `${safeSubdirName}/${safeBaseName}` : safeBaseName;
  if (trimmed !== expectedRelative) {
    return null;
  }

  const targetDir = safeSubdirName
    ? path.resolve(uploadsDir, safeSubdirName)
    : uploadsDir;
  const finalFilePath = path.resolve(targetDir, safeBaseName);

  const relativeToRoot = path.relative(uploadsDir, finalFilePath);
  if (
    !relativeToRoot ||
    relativeToRoot.startsWith('..') ||
    path.isAbsolute(relativeToRoot) ||
    !finalFilePath.startsWith(uploadsDir + path.sep)
  ) {
    return null;
  }

  return { localSubdir: targetDir, localFilePath: finalFilePath };
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

    const uploadDir = path.resolve("./uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      if (!file || typeof file.name !== "string") {
        failCount++;
        continue;
      }

      const safeFileName = path.basename(file.name);
      if (
        !safeFileName ||
        safeFileName !== file.name ||
        safeFileName.includes("..")
      ) {
        console.warn(`⚠️ Skipping unsafe file path: ${file.name}`);
        failCount++;
        continue;
      }

      const localFilePath = path.resolve(uploadDir, safeFileName);
      if (!localFilePath.startsWith(uploadDir + path.sep)) {
        throw new Error("Invalid file path");
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

      console.log(`⬇️ Downloading: ${safeFileName} (${(file.size / 1024).toFixed(1)} KB)...`);
      const fileData = await downloadFile(safeFileName);
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
