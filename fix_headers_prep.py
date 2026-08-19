import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic function to replace CardHeader
    def replace_card_header(match):
        header_content = match.group(0)
        # Check if it has a Title
        title_match = re.search(r'<CardTitle[^>]*>(.*?)</CardTitle>', header_content)
        if not title_match:
            return header_content
        title_text = title_match.group(1)

        # Ensure we keep the flex / justify-between if there's a Select/Dropdown
        # Look for a div that might contain action buttons (like Select or ExportDropdown)
        actions = ""
        # We need a robust way to extract just the actions.
        # It's usually the second child or a flex-end container. Let's look for `<Select`, `<ExportDropdown`, or `<Button` inside the header.
        
        # This is a bit complex with regex. Let's do string replacement for the specific ones.
        return header_content

    return content

# Instead of complex regex for all, I'll write specific replacements for each known card structure.
