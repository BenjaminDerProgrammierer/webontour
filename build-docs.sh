# Build docs for the project
# Usage: ./build-docs.sh docs dist

export DOCS_DIR=$1
export DIST_DIR=$2

mkdir -p "$DIST_DIR"
mkdir -p "$DIST_DIR/docs"
cp -r "$DOCS_DIR/"* "$DIST_DIR/docs/"
cd "$DIST_DIR/docs"

# for each markdown file in the docs directory
# 1. Create a directory with the same name as the markdown file
# 2. Copy any referenced images to the output directory
# 3. Convert the markdown file to html
# 4. Remove the original markdown file
for file in ./*.md; do
    # 1.
    mkdir -p "${file%.md}"
    
    # 2.
    grep -o '!\[.*\]([^)]*\.png)' "$file" | sed 's/.*(\(.*\))/\1/' | while read img; do
        if [ -f "./$img" ]; then
            mv "./$img" "${file%.md}/"
        fi
    done
    
    # 3.
    pandoc -s "$file" --from markdown --to html5 --standalone \
        --embed-resources --mathjax --css=style.css \
        -o "${file%.md}/index.html"
    
    # 4.
    rm "$file"

    echo "Converted $file to ${file%.md}/index.html"
done

rm style.css

# Generate sitemap/index file
cat > ./index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Sitemap</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            margin: 8px 0;
        }
        .directory {
            font-weight: bold;
        }
        .directory::before {
            content: "📄 ";
        }
        .file::before {
            content: "📎 ";
        }
        a {
            text-decoration: none;
            color: #0366d6;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
    <title>Documentation Sitemap</title>
</head>
<body>
    <h1>Documentation Sitemap</h1>
    <ul>
EOF

# List all top-level directories
find . -maxdepth 1 -type d | sort | grep -v "^\.$" | while read dir; do
    dir_name=$(basename "$dir")
    if [ -f "$dir/index.html" ]; then
        echo "        <li class=\"directory\"><a href=\"./$dir_name/index.html\">$dir_name</a></li>" >> ./index.html
    else
        echo "        <li class=\"directory\">$dir_name</li>" >> ./index.html
    fi
done

# List all top-level files
find . -maxdepth 1 -type f | sort | grep -v "index\.html$" | while read file; do
    file_name=$(basename "$file")
    echo "        <li class=\"file\"><a href=\"./$file_name\">$file_name</a></li>" >> ./index.html
done

# Close HTML tags
cat >> ./index.html << EOF
    <li class="site"><a href="https://webontour.eu" target="_blank">Website Home on webontour.eu</a></li>
    </ul>
    <p><small>Generated on $(date)</small></p>
</body>
</html>
EOF

echo "Sitemap generated."
