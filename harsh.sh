# Check if a commit message is provided
if [ -z "$m" ]; then
    echo "Error: Please provide a commit message."
    exit 1
fi

# Pull changes from all branches
git pull --all

# Add all changes to the staging area
git add .

# Commit changes with the provided commit message (enclosed in double quotes)
git commit -m "$m"

# Push changes to all branches
git push --all

# Check the exit status of the last executed command (git push)
if [ $? -eq 0 ]; then
    echo "Git push successful."
else
    echo "Error: Git push failed."
fi