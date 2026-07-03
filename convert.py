import re

with open('/Users/dnt/workspace/trophy/apps/storefront/product-detail.html', 'r') as f:
    html = f.read()

# Extract body content
match = re.search(r'<body[^>]*>(.*?)<script>', html, re.DOTALL)
if match:
    body = match.group(1)
else:
    body = html

# Basic JSX replacements
body = body.replace('class="', 'className="')
body = body.replace('for="', 'htmlFor="')
body = body.replace('<!--', '{/*')
body = body.replace('-->', '*/}')

# Void elements
body = re.sub(r'<(img|input|hr|br|meta|link)([^>]*?)(?<!/)>', r'<\1\2 />', body)

# Style attributes
body = body.replace('style="font-variation-settings: \'FILL\' 1;"', 'style={{ fontVariationSettings: "\'FILL\' 1" }}')

jsx = f"""import type {{ MetaFunction }} from "react-router";

export const meta: MetaFunction = () => {{
  return [
    {{ title: "Cúp Hợp Kim KL1 Premium | TROPHY PRESTIGE" }},
  ];
}};

export default function ProductDetail() {{
  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
      {body}
    </div>
  );
}}
"""

with open('/Users/dnt/workspace/trophy/apps/storefront/app/routes/product.$handle.tsx', 'w') as f:
    f.write(jsx)
