#!/bin/bash

# Usage: line-commenter-tool <action> <filename> <regexPattern> <string1,string2,...>

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

# Process file
while IFS= read -r line; do
    ORIGINAL_LINE="$line"
    line=$(echo "$line" | sed -e 's/^[[:space:]]*//')  # Trim leading spaces

    COMMENT=$(echo "$line" | grep -oE "^$COMMENT_SYMBOL[[:space:]]*")

    case $COMMENT_SYMBOL in
        "//"|"#")
            if [[ "$ACTION" == "comment" ]]; then
                if [[ -z "$COMMENT" && ($line =~ $REGEX_PATTERN || $(echo "${STRINGS[@]}" | grep -qF "$line")) ]]; then
                    echo "$COMMENT_SYMBOL $ORIGINAL_LINE"
                else
                    echo "$ORIGINAL_LINE"
                fi
            elif [[ "$ACTION" == "uncomment" ]]; then
                if [[ -n "$COMMENT" ]]; then
                    echo "${line#$COMMENT_SYMBOL }"
                else
                    echo "$ORIGINAL_LINE"
                fi
            fi
            ;;
        "<!-- -->"|"/* */")
            if [[ "$ACTION" == "comment" ]]; then
                if [[ $line != "<!--"* && $line != "/*"* && ($line =~ $REGEX_PATTERN || $(echo "${STRINGS[@]}" | grep -qF "$line")) ]]; then
                    echo "${COMMENT_SYMBOL% *} $ORIGINAL_LINE ${COMMENT_SYMBOL#* }"
                else
                    echo "$ORIGINAL_LINE"
                fi
            elif [[ "$ACTION" == "uncomment" ]]; then
                if [[ $line == "<!--"* || $line == "/*"* ]]; then
                    line=$(echo "$line" | sed -e "s/^${COMMENT_SYMBOL% *}[[:space:]]*//" -e "s/[[:space:]]*${COMMENT_SYMBOL#* }$//")
                    echo "$line"
                else
                    echo "$ORIGINAL_LINE"
                fi
            fi
            ;;
        *)
            echo "$ORIGINAL_LINE"
            ;;
    esac
done < "$FILENAME"