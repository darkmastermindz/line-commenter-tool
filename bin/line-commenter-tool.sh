#!/bin/bash

# Usage: line-commenter-tool.sh <action> <filename> <regexPattern> <string1,string2,...>

# Check arguments
if [ "$#" -lt 4 ]; then
    echo "Usage: $0 <action> <filename> <regexPattern> <string1,string2,...>"
    exit 1
fi

# Parameters
ACTION=$1
FILENAME=$2
REGEX_PATTERN=$3
IFS=',' read -r -a STRINGS <<< "$4"

# Determine the comment symbol based on file extension
function get_comment_symbol {
    case "$1" in
        *.js|*.jsx|*.ts|*.tsx|*.c|*.cpp|*.cs|*.java|*.php)
            echo "//"
            ;;
        *.py|*.rb|*.sh|*.yml|*.yaml|Dockerfile)
            echo "#"
            ;;
        *.html|*.xml|*.md)
            echo "<!-- -->"
            ;;
        *.css|*.scss|*.less)
            echo "/* */"
            ;;
        *)
            echo "//"  # Default
            ;;
    esac
}

COMMENT_SYMBOL=$(get_comment_symbol "$FILENAME")
START_COMMENT=${COMMENT_SYMBOL% *}
END_COMMENT=${COMMENT_SYMBOL#* }

# Read the entire file content
CONTENT=$(<"$FILENAME")

# Define the function to escape special characters for use in sed
function escape_sed {
    echo "$1" | sed -e 's/[\/&]/\\&/g'
}

# Process the file content
if [[ "$ACTION" == "comment" ]]; then
    for STRING in "${STRINGS[@]}"; do
        STRING=$(escape_sed "$STRING")
        if [[ "$COMMENT_SYMBOL" == "<!-- -->" || "$COMMENT_SYMBOL" == "/* */" ]]; then
            CONTENT=$(echo "$CONTENT" | sed -E "/^[[:space:]]*$(escape_sed "$START_COMMENT").*$(escape_sed "$END_COMMENT")/!s/^([[:space:]]*$STRING.*)$/$(escape_sed "$START_COMMENT") \1 $(escape_sed "$END_COMMENT")/")
        else
            CONTENT=$(echo "$CONTENT" | sed -E "/^[[:space:]]*$(escape_sed "$START_COMMENT")/!s/^([[:space:]]*$STRING.*)$/$(escape_sed "$START_COMMENT") \1/")
        fi
    done
    if [[ "$REGEX_PATTERN" != "" ]]; then
        if [[ "$COMMENT_SYMBOL" == "<!-- -->" || "$COMMENT_SYMBOL" == "/* */" ]]; then
            CONTENT=$(echo "$CONTENT" | sed -E "/^[[:space:]]*$(escape_sed "$START_COMMENT").*$(escape_sed "$END_COMMENT")/!s/^([[:space:]]*($REGEX_PATTERN))/$(escape_sed "$START_COMMENT") \1 $(escape_sed "$END_COMMENT")/")
        else
            CONTENT=$(echo "$CONTENT" | sed -E "/^[[:space:]]*$(escape_sed "$START_COMMENT")/!s/^([[:space:]]*($REGEX_PATTERN))/$(escape_sed "$START_COMMENT") \1/")
        fi
    fi
elif [[ "$ACTION" == "uncomment" ]]; then
    if [[ "$COMMENT_SYMBOL" == "<!-- -->" || "$COMMENT_SYMBOL" == "/* */" ]]; then
        CONTENT=$(echo "$CONTENT" | sed -E "s/^([[:space:]]*)$(escape_sed "$START_COMMENT")[[:space:]]+(.*)[[:space:]]+$(escape_sed "$END_COMMENT")/\1\2/g")
    else
        CONTENT=$(echo "$CONTENT" | sed -E "s/^([[:space:]]*)$(escape_sed "$START_COMMENT")[[:space:]]+(.*)/\1\2/g")
    fi
fi

# Output the modified content back to the file
echo "$CONTENT" > "$FILENAME"