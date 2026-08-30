import codecs

file_path = 'index.html'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

if 'family=Montserrat' not in content:
    content = content.replace(
        '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet">',
        '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
    )
    with codecs.open(file_path, 'w', 'utf-8') as f:
        f.write(content)
    print("Added Montserrat to index.html")
else:
    print("Montserrat already in index.html")
