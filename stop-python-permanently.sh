#!/bin/bash

# Permanently block the old Python service
echo "Blocking old Python service permanently..."

# Kill any Python processes
pkill -9 -i python 2>/dev/null || true

# Remove all potentially problematic plist files
rm -f ~/Library/LaunchAgents/com.zumi.missioncontrol.plist
rm -f ~/Library/LaunchAgents/com.scoopy*.plist
rm -f ~/Library/LaunchDaemons/com.zumi*.plist
rm -f ~/Library/LaunchDaemons/com.scoopy*.plist
rm -f ~/.bashrc
rm -f ~/.bash_profile

# If the Python service is in a different location, find it
echo "Searching for any Python launch agents..."
for plist in ~/Library/LaunchAgents/*.plist; do
  if [ -f "$plist" ] && grep -l "python\|mission\|scoopy\|4173" "$plist" 2>/dev/null; then
    echo "Removing: $plist"
    rm -f "$plist"
  fi
done

echo "✅ Python service permanently blocked"
