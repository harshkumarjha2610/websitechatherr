
#!/bin/bash

# Assign first argument as commit message
m="$1"

# Check if commit message is empty
if [ -z "$m" ]; then
    echo "Error: Please provide a commit message."
    exit 1
fi

# Pull changes from all branches
git pull origin main

# Add all changes to the staging area
git add .

# Commit changes with the provided commit message
git commit -m "$m"

# Push changes to all branches
git push origin main

# Check if git push was successful
if [ $? -eq 0 ]; then
    echo "Git push successful."
else
    echo "Error: Git push failed."
fi

