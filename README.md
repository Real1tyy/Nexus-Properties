# Nexus Properties

An Obsidian plugin that automatically manages bidirectional property relationships and recursive tree properties.

## Features

- **Bidirectional Sync**: When you assign a child to a parent, the parent property is automatically updated
- **Recursive Tree Properties**: Automatically computes `allChildren`, `allParents`, and `allRelated` properties
- **Automatic Cleanup**: Maintains consistency when files are deleted or relationships change
- **Fully Configurable**: Customize all property names to match your workflow

## Settings

Configure the property names used for relationship management:
- `parent` - Property for parent reference
- `children` - Property for children references
- `related` - Property for related files
- `allParents` - Computed property for all recursive parents
- `allChildren` - Computed property for all recursive children
- `allRelated` - Computed property for all related files

## License

MIT