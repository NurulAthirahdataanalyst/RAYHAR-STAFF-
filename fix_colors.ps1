$files = Get-ChildItem -Path "src\pages\outstation" -Filter "*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace 'text-gray-800(?! dark:)', 'text-gray-800 dark:text-gray-100'
    $content = $content -replace 'text-gray-700(?! dark:)', 'text-gray-700 dark:text-gray-200'
    $content = $content -replace 'text-gray-600(?! dark:)', 'text-gray-600 dark:text-gray-300'
    $content = $content -replace 'text-gray-500(?! dark:)', 'text-gray-500 dark:text-gray-400'
    Set-Content $file.FullName $content
}
