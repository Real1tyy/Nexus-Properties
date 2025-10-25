---
sidebar_position: 100
---

# Contributing

Thank you for considering contributing to Nexus Properties! This document provides guidelines and information for contributors.

## Ways to Contribute

### 🐛 Report Bugs

Help improve quality by reporting issues:

1. **Search existing issues** first to avoid duplicates
2. **Use the bug report template** when creating an issue
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Obsidian version and plugin version
   - Console errors (if any)
   - Screenshots (if visual)

[Report a bug →](https://github.com/Real1tyy/Nexus-Properties/issues/new)

### 💡 Suggest Features

Share your ideas for improvements:

1. **Search discussions** for similar suggestions
2. **Create a new discussion** with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach (optional)
3. **Engage with feedback** from maintainers and community

[Suggest a feature →](https://github.com/Real1tyy/Nexus-Properties/discussions/new)

### 📖 Improve Documentation

Documentation is crucial for adoption:

- **Fix typos or errors** in existing docs
- **Add examples** to clarify concepts
- **Write tutorials** for common workflows
- **Translate** documentation (future)
- **Improve clarity** of explanations

Documentation lives in `docs-site/docs/`

### 💻 Contribute Code

Contribute bug fixes, features, or improvements:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Write/update tests**
5. **Submit a pull request**

See [Development Setup](#development-setup) below.

### 🎨 Design Improvements

Help improve the UI/UX:

- **Graph styling** improvements
- **Settings UI** enhancements
- **Accessibility** improvements
- **Theme compatibility** fixes

### 🧪 Testing

Help ensure quality:

- **Test new features** in beta/preview builds
- **Report edge cases** and unexpected behavior
- **Test on different platforms** (Windows, Mac, Linux)
- **Test with different themes** and configurations

### 💬 Community Support

Help others in the community:

- **Answer questions** in GitHub Discussions
- **Share your workflows** and tips
- **Write blog posts** or tutorials
- **Create videos** demonstrating features

## Development Setup

### Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **pnpm** (install with `npm install -g pnpm`)
- **Git** for version control
- **Obsidian** for testing

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Nexus-Properties.git
cd Nexus-Properties

# Install dependencies
pnpm install

# Build the plugin
pnpm build
```

### Development Workflow

**Hot reload development**:
```bash
# Watch for changes and rebuild automatically
pnpm dev
```

This creates:
- `main.js` - Plugin code
- `styles.css` - Styles
- `manifest.json` - Plugin manifest

**Link to Obsidian vault**:
```bash
# Create symlink to your test vault
# Windows (as Administrator):
mklink /D "C:\Users\YourUser\YourVault\.obsidian\plugins\nexus-properties" "C:\path\to\Nexus-Properties"

# Mac/Linux:
ln -s /path/to/Nexus-Properties /path/to/YourVault/.obsidian/plugins/nexus-properties
```

Then reload the plugin in Obsidian after changes.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Linting and Formatting

```bash
# Check for issues
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Format code
pnpm format
```

### Building for Production

```bash
# Create optimized build
pnpm build

# Version bump (for maintainers)
pnpm version:bump
```

## Code Guidelines

### TypeScript

- **Use TypeScript** for all code (strict mode)
- **Define interfaces** for data structures
- **Avoid `any`** - use proper types
- **Use type inference** where possible
- **Document complex types** with JSDoc

### Code Style

- **2 spaces** for indentation
- **Semicolons** required
- **Single quotes** for strings
- **Trailing commas** in multiline
- **Arrow functions** preferred
- Follow the existing code style

### File Organization

```
src/
├── components/     # UI components
├── core/          # Core business logic
├── types/         # Type definitions
└── utils/         # Utility functions
```

- **Keep files focused** - single responsibility
- **Extract reusable code** to utils
- **Separate concerns** - UI vs logic
- **Use barrel exports** (`index.ts`)

### Naming Conventions

- **Classes**: PascalCase (`GraphBuilder`)
- **Functions/methods**: camelCase (`buildGraph`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_COLOR`)
- **Files**: kebab-case (`graph-builder.ts`)
- **Types/Interfaces**: PascalCase (`NodeData`)

### Comments

- **Document why**, not what
- **Use JSDoc** for public APIs
- **Explain complex logic**
- **Keep comments up-to-date**
- **Remove commented-out code**

### Testing

- **Write tests** for new features
- **Update tests** when changing behavior
- **Test edge cases** and error conditions
- **Aim for high coverage** (80%+)
- **Use descriptive test names**

Example:
```typescript
describe("GraphBuilder", () => {
  describe("buildHierarchy", () => {
    it("should include all children recursively", () => {
      // Test implementation
    });

    it("should handle circular relationships", () => {
      // Test implementation
    });
  });
});
```

## Pull Request Process

### Before Submitting

1. **Create an issue** first for large changes
2. **Fork and branch** from `main`
3. **Follow code guidelines** above
4. **Write/update tests** for your changes
5. **Update documentation** if needed
6. **Run all checks**:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```
7. **Test in Obsidian** with various scenarios

### PR Guidelines

**Good PR title examples**:
- `fix: Circular relationship detection in parent-child links`
- `feat: Add keyboard navigation to graph`
- `docs: Add examples for color rule expressions`
- `refactor: Extract graph layout logic to separate class`

**PR description should include**:
- **What** changed
- **Why** it changed
- **How** to test it
- **Screenshots** (if visual changes)
- **Breaking changes** (if any)

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test the changes

## Screenshots (if applicable)
Add screenshots for visual changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Tested in Obsidian
```

### Review Process

1. **Automated checks** must pass (linting, tests, build)
2. **Maintainer review** - may request changes
3. **Address feedback** - update PR as needed
4. **Approval** - maintainer approves when ready
5. **Merge** - maintainer merges to main

## Git Commit Guidelines

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding/updating tests
- **chore**: Build process, dependencies, etc.

### Examples

```
feat: Add filter presets to graph header

Add dropdown selector for quickly applying saved filter presets.
Users can now switch between predefined filters without typing expressions.

Closes #123
```

```
fix: Prevent circular relationships in parent-child links

Check for circular dependencies before establishing relationships.
Show error notice when circular link would be created.

Fixes #45
```

## Code of Conduct

### Our Pledge

We pledge to make participation in our community a harassment-free experience for everyone, regardless of:
- Age, body size, disability
- Ethnicity, gender identity
- Level of experience
- Nationality, personal appearance
- Race, religion
- Sexual identity and orientation

### Our Standards

**Positive behavior**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior**:
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **Documentation** for doc contributors

## Financial Support

Support the project's development:

- **GitHub Sponsors**: [Sponsor Real1ty](https://github.com/sponsors/Real1tyy)
- **Buy Me a Coffee**: [Support on Ko-fi](https://ko-fi.com/real1ty)

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- **Development questions**: Ask in issues or discussions
- **Private inquiries**: Contact via GitHub profile

## License

By contributing, you agree that your contributions will be licensed under the **MIT License**.

## Thank You!

Your contributions make Nexus Properties better for everyone. Whether you're fixing a typo or adding a major feature, every contribution is valued and appreciated! 🙏

---

**Happy Contributing! 🚀**
