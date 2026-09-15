#!/bin/sh
# Export a directory from a GitHub repository into a local directory.
# Usage: github_export.sh <owner/repo> <ref> <subdir|.> <dest>
#
# GitHub turned off its Subversion bridge in January 2024, so the archive
# tarball is the only remaining way to grab a subtree without cloning history.

set -eu

repo="$1"
ref="$2"
subdir="$3"
dest="$4"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "Exporting $repo@$ref/$subdir -> $dest"
wget -q -O "$tmp/archive.tar.gz" "https://codeload.github.com/$repo/tar.gz/$ref"
mkdir -p "$tmp/unpacked"
tar -xzf "$tmp/archive.tar.gz" -C "$tmp/unpacked"

root=$(find "$tmp/unpacked" -mindepth 1 -maxdepth 1 -type d | head -1)
src="$root"
if [ "$subdir" != "." ]; then
  src="$root/$subdir"
fi
if [ ! -d "$src" ]; then
  echo "No such directory in $repo@$ref: $subdir" >&2
  exit 1
fi

mkdir -p "$dest"
cp -R "$src"/. "$dest"/
