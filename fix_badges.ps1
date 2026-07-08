$files = "src\pages\outstation\MyOutstation.tsx", "src\pages\outstation\OutstationAssignment.tsx", "src\pages\outstation\OutstationReports.tsx"
foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'bg-pink-100(?! dark:)', 'bg-pink-100 dark:bg-pink-500/20'
    $content = $content -replace 'text-pink-700(?! dark:)', 'text-pink-700 dark:text-pink-300'
    $content = $content -replace 'border-pink-200(?! dark:)', 'border-pink-200 dark:border-pink-500/30'

    $content = $content -replace 'bg-amber-100(?! dark:)', 'bg-amber-100 dark:bg-amber-500/20'
    $content = $content -replace 'text-amber-700(?! dark:)', 'text-amber-700 dark:text-amber-300'
    $content = $content -replace 'border-amber-200(?! dark:)', 'border-amber-200 dark:border-amber-500/30'

    $content = $content -replace 'bg-blue-100(?! dark:)', 'bg-blue-100 dark:bg-blue-500/20'
    $content = $content -replace 'text-blue-700(?! dark:)', 'text-blue-700 dark:text-blue-300'
    $content = $content -replace 'border-blue-200(?! dark:)', 'border-blue-200 dark:border-blue-500/30'
    
    $content = $content -replace 'bg-gray-100(?! dark:)', 'bg-gray-100 dark:bg-gray-500/20'
    $content = $content -replace 'border-gray-200(?! dark:)', 'border-gray-200 dark:border-gray-500/30'
    
    Set-Content $file $content
}
