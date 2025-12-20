---
sidebar_position: 99
---

# Troubleshooting

Common issues and their solutions. If you don't find your issue here, check the [FAQ](faq) or [open an issue on GitHub](https://github.com/Real1tyy/Nexus-Properties/issues).

## Graph Issues

### Graph Not Showing Any Nodes

**Symptoms**: Empty graph or only source node visible

**Solutions**:
1. **Check directory scanning**:
   - Settings → Nexus Properties → Directory scanning
   - Ensure current file's folder is scanned
   - Or use `["*"]` to scan all directories
2. **Check relationships exist**:
   - File must have `Parent`, `Child`, or `Related` properties
   - Add relationships to see connections
3. **Check view mode**:
   - Hierarchical mode needs parent-child relationships
   - Related mode needs related relationships
   - Try different view modes
4. **Check filters**:
   - Clear any active filters
   - Filters might be hiding all nodes
5. **Run full rescan**:
   - Settings → Nexus Properties → Indexing
   - Click "Rescan Everything"

### Graph Showing Wrong Nodes

**Symptoms**: Unexpected nodes appear or expected nodes missing

**Solutions**:
1. **Check view mode**:
   - Hierarchical shows parent-child tree
   - Related shows direct related only
   - All Related shows entire constellation
   - Use correct mode for what you want to see
2. **Check "Include All Related"**:
   - In Hierarchical mode, this checkbox adds related nodes
   - Toggle to see difference
3. **Check "Start from Current"**:
   - When enabled, shows from current file down
   - When disabled, shows from root down
   - Toggle to see full hierarchy vs subtree
4. **Check filters**:
   - Active filters hide non-matching nodes
   - Clear filters to see all nodes
5. **Verify relationships**:
   - Open files and check frontmatter
   - Use [tooltips](features/tooltips) to verify properties
   - Run rescan if relationships seem wrong

### Nodes Overlapping or Bad Layout

**Symptoms**: Nodes on top of each other or layout looks broken

**Solutions**:
1. **Refresh layout**:
   - Switch view mode and back
   - Resize graph window
   - Enter/exit zoom mode
2. **Check animation duration**:
   - If too fast, layout might not settle
   - Increase to 800ms for smoother transitions
3. **Reduce node count**:
   - Use filters to show fewer nodes
   - Reduce recursion depth
   - Use "Start from Current" for focused view
4. **Report as bug**:
   - If persistent, [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues)
   - Include screenshot and node count

### Graph Performance is Slow

**Symptoms**: Lag when interacting with graph, slow animations

**Solutions**:
1. **Reduce recursion depth**:
   - Settings → All Related Max Depth (lower to 5-7)
   - Settings → Hierarchy Traversal Depth (lower to 10-15)
2. **Disable animations**:
   - Settings → Graph Animation Duration → 0ms
3. **Limit directory scanning**:
   - Settings → Directory scanning
   - Only scan folders you need
4. **Use filtering**:
   - Apply filters to reduce visible nodes
   - Fewer nodes = better performance
5. **Use "Start from Current"**:
   - Shows subset instead of entire tree
6. **Check other plugins**:
   - Disable other resource-intensive plugins temporarily
   - Check if performance improves

## Relationship Issues

### Relationships Not Syncing

**Symptoms**: Adding relationship in one file doesn't update the other

**Solutions**:
1. **Check property names**:
   - Settings → Nexus Properties → Direct relationship properties
   - Verify you're using correct property names (default: `Parent`, `Child`, `Related`)
   - Case-sensitive!
2. **Check wiki link format**:
   - Must use `[[note name]]` format
   - Not plain text
   - Not markdown links `[text](file.md)`
3. **Check directory scanning**:
   - Both files must be in indexed directories
   - Settings → Directory scanning
4. **Check file saved**:
   - Ensure file is saved after changes
   - Try closing and reopening file
5. **Run full rescan**:
   - Settings → Nexus Properties → Indexing
   - Click "Rescan Everything"
6. **Check console for errors**:
   - `Ctrl/Cmd+Shift+I`
   - Look for relationship sync errors

### Orphaned Relationships

**Symptoms**: Relationships pointing to non-existent files

**Solutions**:
1. **Check target file exists**:
   - Verify file wasn't deleted or renamed
   - Search vault for the file
2. **Check wiki link spelling**:
   - Typos in file names
   - Case sensitivity
3. **Run full rescan**:
   - Automatically cleans up orphaned relationships
   - Settings → Indexing → "Rescan Everything"
4. **Manual cleanup**:
   - Open file with orphaned relationship
   - Remove broken link from frontmatter
   - Save file

### Circular Relationships

**Symptoms**: A is parent of B, B is parent of A

**Solutions**:
- Plugin should prevent this automatically
- If it occurs:
  1. Manually break one relationship
  2. Run full rescan
  3. Report as bug if prevention didn't work

### Too Many Auto-Linked Siblings

**Symptoms**: Siblings automatically marked as related, cluttering the graph

**Solutions**:
1. **Disable auto-link siblings**:
   - Settings → Direct relationship properties
   - Uncheck "Auto-link siblings"
2. **Or use filtering**:
   - Filter out sibling relationships
   - Keep feature enabled but hide in graph

## Color Rules Issues

### Color Rule Not Working

**Symptoms**: Nodes not changing color despite rule

**Solutions**:
1. **Check expression syntax**:
   - Must be valid JavaScript
   - Property names case-sensitive
   - Strings need quotes: `status === 'active'`
   - Not `status === active`
2. **Check property exists**:
   - Use [tooltips](features/tooltips) to verify property name
   - Check frontmatter directly
   - Property might be misspelled
3. **Check rule enabled**:
   - Settings → Node colors
   - Checkbox should be checked
4. **Check rule order**:
   - First matching rule wins
   - Earlier rule might be matching instead
   - Reorder with ↑/↓ buttons
5. **Check console for errors**:
   - `Ctrl/Cmd+Shift+I`
   - Invalid expressions logged to console

### All Nodes Same Color

**Symptoms**: Color rules not creating variety

**Solutions**:
1. **Check properties vary**:
   - Nodes need different property values
   - If all nodes have `status: active`, all match same rule
2. **Check rule expressions**:
   - Rules might be too broad
   - First rule might match everything
3. **Add more specific rules**:
   - Create rules for each category
   - Check property values in your notes

## Filtering Issues

### Filter Not Working

**Symptoms**: Nodes still visible despite filter

**Solutions**:
1. **Check expression syntax**:
   - Must be valid JavaScript
   - Same rules as color expressions
2. **Check property names**:
   - Case-sensitive
   - Must match frontmatter exactly
3. **Check filter applied**:
   - Press `Ctrl/Cmd+Enter` or click outside input
   - Filter must be applied to take effect
4. **Check source node**:
   - Source node always visible (intentional)
   - Even if doesn't match filter
5. **Check console for errors**:
   - Invalid filters logged to console

### No Nodes After Filtering

**Symptoms**: All nodes hidden (except source)

**Solutions**:
1. **Filter too restrictive**:
   - No nodes match the criteria
   - Broaden filter expression
2. **Property doesn't exist**:
   - Nodes might not have the property
   - Check frontmatter of a few nodes
3. **Add existence check**:
   - `typeof property !== 'undefined' && property === 'value'`
4. **Clear filter**:
   - Delete text from filter input
   - Press `Ctrl/Cmd+Enter`

## Zoom Mode Issues

### Zoom Mode Not Activating

**Symptoms**: Clicking node doesn't enter zoom mode

**Solutions**:
1. **Check clicking correct area**:
   - Click the node itself, not empty space
   - Not the node label
2. **Check node is valid**:
   - File must exist
   - Not a deleted/orphaned node
3. **Try different node**:
   - Some nodes might have issues
   - Test with known good node
4. **Reload graph**:
   - Close and reopen graph view

### Preview Panel Not Showing

**Symptoms**: Zoom mode active but no preview

**Solutions**:
1. **Check preview height**:
   - Settings → Zoom Preview Height
   - Must be > 120px
   - Increase if very small
2. **Check visibility toggles**:
   - Eye icons in preview header
   - Both might be hidden
   - Click to show sections
3. **Check file not empty**:
   - Empty files have empty preview
   - Add content to see it

### Content Not Rendering

**Symptoms**: Blank preview despite content in file

**Solutions**:
1. **Check markdown syntax**:
   - Invalid markdown might not render
   - Open file directly to verify
2. **Check content section visible**:
   - Eye icon should be open
   - Click to toggle visibility
3. **Check frontmatter vs content**:
   - Frontmatter section separate from content
   - Toggle correct section
4. **Reload graph view**:
   - Close and reopen graph

## Node Creation Issues

### Commands Grayed Out

**Symptoms**: "Create Child/Parent/Related Node" commands unavailable

**Solutions**:
1. **Check viewing a file**:
   - Commands only work when viewing a note
   - Not when in graph view alone
2. **Check file indexed**:
   - File must be in scanned directory
   - Settings → Directory scanning
3. **Check file type**:
   - Must be a markdown file
   - Not an image, PDF, etc.

### Properties Not Inherited

**Symptoms**: New node missing properties from source

**Solutions**:
1. **Check excluded properties**:
   - Settings → Excluded properties
   - Property might be in default exclusion list
   - Or in path-based rule
2. **Check property exists in source**:
   - Verify source file has the property
   - Can't inherit what doesn't exist
3. **Check property name spelling**:
   - Case-sensitive
   - Must match exactly

### Relationship Not Created

**Symptoms**: New node not linked to source

**Solutions**:
1. **Check both files**:
   - Open both files
   - Verify frontmatter in each
2. **Check property names**:
   - Settings → Direct relationship properties
   - Using correct property names?
3. **Run full rescan**:
   - Settings → Indexing → "Rescan Everything"
   - Rebuilds all relationships

### File Name Conflicts

**Symptoms**: "File already exists" error

**Solution**:
- Plugin auto-increments numbers (`untitled-1`, `untitled-2`, etc.)
- If this fails, manually create with unique name
- Report as bug if auto-increment not working

## Search Issues

### Search Not Finding Nodes

**Symptoms**: Typing in search doesn't highlight nodes

**Solutions**:
1. **Check search bar visible**:
   - Command: "Toggle Graph Search"
   - Or enable default visibility in settings
2. **Check typing in correct field**:
   - Click search input to focus
   - Text should appear as you type
3. **Check searching filename**:
   - Search only searches filename/path
   - Not content or properties
   - Use filter for property-based search
4. **Check case-insensitive**:
   - Should match regardless of case
   - Try lowercase version

### All Nodes Dim

**Symptoms**: All nodes dimmed, none highlighted

**Solution**:
- No nodes match search
- Check spelling
- Try partial match (first few letters)
- Clear search to return to normal

## Performance Issues

### Plugin Slow on Startup

**Symptoms**: Long wait when opening Obsidian or enabling plugin

**Solutions**:
1. **Large vault indexing**:
   - Initial index can take time
   - Progress logged to console (`Ctrl/Cmd+Shift+I`)
2. **Limit directory scanning**:
   - Settings → Directory scanning
   - Only scan necessary folders
3. **Check other plugins**:
   - Disable other plugins temporarily
   - See if startup improves
4. **Check vault size**:
   - Thousands of files take longer
   - Consider splitting into multiple vaults

### Memory Issues

**Symptoms**: Obsidian becomes sluggish or crashes

**Solutions**:
1. **Reduce node count**:
   - Use filtering aggressively
   - Limit recursion depth
   - Focus on smaller subsets
2. **Disable animation**:
   - Settings → Animation Duration → 0ms
3. **Close other plugins**:
   - Disable resource-intensive plugins
4. **Restart Obsidian**:
   - Memory leaks can accumulate
   - Restart periodically
5. **Consider splitting vault**:
   - Very large vaults may need splitting

## Console Errors

### Check the Console

Many issues show errors in the developer console:

1. **Open console**:
   - Press `Ctrl/Cmd+Shift+I`
   - Click "Console" tab
2. **Look for Nexus Properties errors**:
   - Error messages in red
   - Warnings in yellow
3. **Copy error messages**:
   - Right-click error → Copy
   - Include in bug report

### Common Error Messages

**"File not found"**:
- Orphaned relationship
- File was deleted or renamed
- Run full rescan to clean up

**"Invalid expression"**:
- Color rule or filter expression has syntax error
- Check expression in settings
- Fix JavaScript syntax

**"Circular relationship detected"**:
- System prevented circular link
- Choose different parent/child
- Should be automatic prevention

**"Property not found"**:
- Expected property doesn't exist in file
- Check frontmatter
- Add property or adjust expression

## Getting More Help

### Before Asking for Help

Collect information:
1. **Obsidian version**: Help → About
2. **Plugin version**: Settings → Community plugins → Nexus Properties
3. **Error messages**: From console (`Ctrl/Cmd+Shift+I`)
4. **Steps to reproduce**: How to trigger the issue
5. **Expected vs actual**: What should happen vs what does

### Where to Ask

1. **Check FAQ**: [Frequently Asked Questions](faq)
2. **Search issues**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
3. **Ask community**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
4. **Report bug**: [New Issue](https://github.com/Real1tyy/Nexus-Properties/issues/new)

### Include in Bug Reports

- Obsidian version
- Plugin version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors (if any)
- Screenshots (if visual issue)
- Relevant frontmatter examples

## Still Having Issues?

If you can't find a solution:
1. [Search existing issues](https://github.com/Real1tyy/Nexus-Properties/issues)
2. [Open a new issue](https://github.com/Real1tyy/Nexus-Properties/issues/new)
3. Provide detailed information
4. Attach screenshots/logs

We're here to help! 🚀
