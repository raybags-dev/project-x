#!/bin/bash

# Find and rename files in the ./src directory
find ./src -type f -iname '*tripadvisor*' | while read file; do
    newfile=$(echo "$file" | sed 's/[Tt][Rr][Ii][Pp][Aa][Dd][Vv][Ii][Ss][Oo][Rr]/expedia/g')
    mv "$file" "$newfile"
done
