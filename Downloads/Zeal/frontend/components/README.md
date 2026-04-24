# Component Architecture

This project follows a well-organized component structure that separates concerns and promotes maintainability.

## 📁 Folder Structure

```
components/
├── context/           # React Context providers and global state
│   └── RoleContext.jsx
├── screens/           # Screen-specific components (organized by feature)
│   ├── user/          # User-specific screens
│   │   └── home.jsx
│   └── company/       # Company-specific screens
│       └── home.jsx
├── shared/            # Reusable components used across multiple screens
│   ├── external-link.jsx
│   ├── haptic-tab.jsx
│   ├── hello-wave.jsx
│   ├── parallax-scroll-view.jsx
│   ├── themed-text.jsx
│   └── themed-view.jsx
└── ui/                # Basic UI components and widgets
    ├── collapsible.jsx
    ├── icon-symbol.ios.jsx
    ├── icon-symbol.jsx
    └── tab-role-toggle.jsx
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **Screens**: Feature-specific components that represent entire screens/pages
- **Shared**: Reusable components that can be used across different screens
- **UI**: Basic, atomic UI components
- **Context**: Global state management

### 2. **Naming Conventions**
- Use lowercase with dashes: `user-home.jsx`, `tab-role-toggle.jsx`
- Group related components in subdirectories
- Screen components: `screens/{feature}/component.jsx`
- Shared components: `shared/component.jsx`
- UI components: `ui/component.jsx`

### 3. **Import Organization**
- Relative imports within components directory: `../../shared/component`
- Clear import paths that reflect the architecture
- Group imports by type (React, external libraries, internal components)

### 4. **File Organization Rules**
- **One component per file** (except for closely related variants)
- **Index files** for clean imports when appropriate
- **Consistent file extensions** (.jsx for React components)
- **Descriptive filenames** that clearly indicate purpose

## 🚀 Benefits

- **Scalability**: Easy to add new features without conflicts
- **Maintainability**: Clear separation makes code easier to find and modify
- **Developer Experience**: Multiple developers can work on different features simultaneously
- **Testing**: Easier to test isolated components
- **Code Reuse**: Shared components promote DRY principles

## 📝 Usage Guidelines

### Adding New Components

1. **Screen Components**: Place in `screens/{feature}/`
   ```jsx
   // components/screens/user/profile.jsx
   export default function UserProfile() { ... }
   ```

2. **Shared Components**: Place in `shared/`
   ```jsx
   // components/shared/custom-button.jsx
   export default function CustomButton() { ... }
   ```

3. **UI Components**: Place in `ui/`
   ```jsx
   // components/ui/loading-spinner.jsx
   export default function LoadingSpinner() { ... }
   ```

4. **Context Providers**: Place in `context/`
   ```jsx
   // components/context/AuthContext.jsx
   export const AuthProvider = ({ children }) => { ... }
   ```

### Importing Components

```jsx
// ✅ Good - clear and organized imports
import { useRole } from '../../components/context/RoleContext';
import UserHome from '../../components/screens/user/home';
import { ThemedText } from '../../components/shared/themed-text';
import TabRoleToggle from '../../components/ui/tab-role-toggle';

// ❌ Avoid - flat imports from root
import UserHome from '../../components/user-home';
```

## 🔧 Development Workflow

1. **Plan component placement** based on reusability and purpose
2. **Create appropriate directory structure** if needed
3. **Follow naming conventions** consistently
4. **Update imports** in all files that reference moved components
5. **Test thoroughly** after restructuring

This architecture ensures clean, maintainable, and scalable React Native code! 🎉</content>
<parameter name="filePath">/Users/irfanrahmanindra/Documents/GitHub/The-Digital-Seal/frontend/components/README.md