# VirtuoNext iOS Conversion Guide

## Overview
This guide outlines the steps to convert your React web app into an iOS application while reusing most of your existing UI components and logic.

## Recommended Approach: React Native with Expo

Since you're already using React and TypeScript, the smoothest path is **React Native with Expo**, which allows you to:
- Reuse ~70-80% of your existing component logic
- Keep your TypeScript types and interfaces
- Maintain your Supabase backend integration
- Use similar styling concepts (though not Tailwind directly)

### Alternative Approaches
1. **Capacitor** - Wraps your web app in a native container (easier but less native feel)
2. **Progressive Web App (PWA)** - Not a true app store app, but works on iOS Safari
3. **Full React Native rewrite** - More work but most native experience

---

## Step 1: Set Up Development Environment

### Prerequisites
```bash
# Install Xcode from Mac App Store (required for iOS development)
# After installation, open Xcode and accept license agreements

# Install Xcode Command Line Tools
xcode-select --install

# Install Node.js dependencies
npm install -g expo-cli
```

### Install iOS Simulator
1. Open Xcode
2. Go to Xcode > Preferences > Components
3. Download iOS Simulator for your target iOS version

---

## Step 2: Create React Native Project

```bash
# Create new Expo project with TypeScript
npx create-expo-app VirtuoNextiOS --template expo-template-blank-typescript

cd VirtuoNextiOS

# Install necessary dependencies
npx expo install expo-router react-native-safe-area-context react-native-screens
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-url-polyfill
```

---

## Step 3: Port Existing Code

### What Can Be Reused (Copy Directly)
- ✅ All TypeScript interfaces (`Ask`, `Bid`, etc.)
- ✅ Supabase client configuration (with minor adjustments)
- ✅ Business logic functions (bid validation, date formatting, etc.)
- ✅ State management logic (useState, useEffect patterns)
- ✅ API calls and data fetching logic

### What Needs Adaptation

#### 3.1 Component Structure
**Web (Current):**
```tsx
// Uses div, Card, Button from shadcn/ui
<Card>
  <CardContent>
    <div className="flex items-center">
      <Button onClick={...}>Click</Button>
    </div>
  </CardContent>
</Card>
```

**React Native (New):**
```tsx
// Uses View, Text, TouchableOpacity from react-native
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

<View style={styles.card}>
  <View style={styles.content}>
    <View style={styles.flexRow}>
      <TouchableOpacity onPress={...}>
        <Text>Click</Text>
      </TouchableOpacity>
    </View>
  </View>
</View>
```

#### 3.2 Styling Conversion
**Web (Tailwind CSS):**
```tsx
<div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg">
```

**React Native (StyleSheet):**
```tsx
<View style={styles.container}>

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // or use marginRight/Left
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fe440a',
    borderRadius: 8,
  }
});
```

**Tip:** Consider using `nativewind` to keep Tailwind-like syntax in React Native.

#### 3.3 Navigation Changes
**Web:** Uses modals and single-page with tabs
**Mobile:** Use React Navigation with stack/tab navigators

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

---

## Step 4: Mobile-Specific Adaptations

### 4.1 Profile Sidebar → Bottom Tab + Profile Screen
**Current Issue:** Sidebar takes up valuable mobile screen space

**Solution:**
1. Remove ProfileSidebar from main view
2. Create dedicated Profile tab in bottom navigation
3. Show profile stats and activity in full-screen view
4. Keep edit profile as modal/sheet overlay

```
Mobile Layout:
┌─────────────────┐
│   Marketplace   │
│                 │
│  [Ask Cards]    │
│  [Ask Cards]    │
│                 │
├─────────────────┤
│ 🏠 | 📊 | 👤   │ ← Bottom tabs: Home, Activity, Profile
└─────────────────┘
```

### 4.2 Component Conversions Priority List

1. **High Priority (Core Features):**
   - AskCard → Mobile card component with touchable areas
   - BidModal → React Native Modal or Bottom Sheet
   - CreateAskModal → Full screen or modal sheet
   - Login/Signup → Mobile-optimized forms

2. **Medium Priority:**
   - Marketplace filters → Collapsible sections or separate screen
   - Activity view → Tab or stack navigation
   - Auction timer → Mobile-friendly countdown

3. **Low Priority (Nice-to-have):**
   - Contact reveals → In-app messaging integration
   - Stripe integration → react-native-stripe-sdk
   - Push notifications → Expo notifications

### 4.3 Form Inputs
Replace HTML inputs with React Native components:
```tsx
import { TextInput } from 'react-native';

<TextInput
  style={styles.input}
  placeholder="Enter amount"
  keyboardType="numeric"
  value={amount}
  onChangeText={setAmount}
/>
```

### 4.4 Date Pickers
```bash
npm install @react-native-community/datetimepicker
```

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';

<DateTimePicker
  value={date}
  mode="date"
  onChange={(event, selectedDate) => setDate(selectedDate)}
/>
```

---

## Step 5: Supabase Configuration for Mobile

### Update Supabase Client
```typescript
// src/utils/supabase/client.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Step 6: Testing on iOS

### Run in Simulator
```bash
# Start development server
npx expo start

# Press 'i' to open iOS simulator
# Or scan QR code with Expo Go app on physical iPhone
```

### Common Issues & Fixes
1. **Fonts not loading:** Use `expo-font` and load fonts in App.tsx
2. **SafeArea issues:** Wrap app in `<SafeAreaProvider>` and use `<SafeAreaView>`
3. **Keyboard covering inputs:** Use `KeyboardAvoidingView` or `react-native-keyboard-aware-scroll-view`

---

## Step 7: Build for App Store

### Prerequisites
- Apple Developer Account ($99/year)
- App Store Connect setup
- App icons and screenshots prepared

### Build Process
```bash
# Install EAS CLI (Expo Application Services)
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure build
eas build:configure

# Create iOS build
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### App Store Requirements
1. **Privacy Policy** - Required for App Store submission
2. **App Icons** - 1024x1024px and various sizes
3. **Screenshots** - Different iPhone/iPad sizes
4. **Description** - App description, keywords, categories
5. **Age Rating** - Complete questionnaire

---

## Step 8: Migration Strategy (Recommended Order)

### Phase 1: Foundation (Week 1)
- [ ] Set up React Native project
- [ ] Configure Supabase client
- [ ] Port TypeScript types/interfaces
- [ ] Create basic navigation structure
- [ ] Design mobile layout (sketches/wireframes)

### Phase 2: Authentication (Week 2)
- [ ] Port login/signup screens
- [ ] Test Supabase auth flow
- [ ] Add user type selection (soloist/pianist)
- [ ] Store session in AsyncStorage

### Phase 3: Core Features (Week 3-4)
- [ ] Port AskCard component
- [ ] Create Marketplace screen
- [ ] Implement CreateAskModal (as full screen or sheet)
- [ ] Port BidModal
- [ ] Test bid submission flow

### Phase 4: Secondary Features (Week 5)
- [ ] Port Activity view
- [ ] Create Profile screen (replaces sidebar)
- [ ] Add auction timers
- [ ] Implement contact reveals

### Phase 5: Polish & Testing (Week 6)
- [ ] Add loading states and error handling
- [ ] Optimize performance
- [ ] Test on physical iPhone
- [ ] Fix UI bugs and responsive issues
- [ ] Add haptic feedback

### Phase 6: Submission (Week 7)
- [ ] Create app icons and assets
- [ ] Write App Store description
- [ ] Take screenshots
- [ ] Submit for review
- [ ] Address Apple's feedback (if any)

---

## Helpful Resources

### Documentation
- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/
- Supabase + React Native: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

### UI Libraries (Optional)
- **React Native Paper**: Material Design components
- **NativeBase**: Cross-platform component library
- **React Native Elements**: Customizable component library
- **Tamagui**: Universal UI kit (web + native)

### Tools
- **Expo Go**: Test app on physical device without building
- **React Native Debugger**: Enhanced debugging experience
- **Flipper**: Mobile app debugging platform

---

## When to Prompt for Help

When you're ready to start the iOS conversion, you can prompt me with:

1. **"Let's start iOS conversion - Phase 1"** - I'll help set up the project
2. **"Convert [ComponentName] to React Native"** - For specific component conversions
3. **"Help with mobile navigation structure"** - For app architecture
4. **"Debug iOS build issue"** - For build/deployment problems

---

## Cost Considerations

- **Apple Developer Account**: $99/year
- **Expo EAS Build**: Free tier available (limited builds), paid plans from $29/month
- **Physical iPhone**: Optional but recommended for testing (can use simulator initially)

---

## Questions to Consider Before Starting

1. **Do you want to maintain both web and mobile apps?** (shared codebase vs. separate)
2. **What's your target iOS version?** (iOS 14+ recommended)
3. **Will you need push notifications?** (requires additional setup)
4. **Payment integration needed on mobile?** (Stripe, Apple Pay)
5. **Offline functionality?** (cache data locally)

---

## Next Steps

1. ✅ Finish web app and test thoroughly
2. ✅ Review this guide and ask questions
3. ✅ Set up development environment (Xcode, etc.)
4. ✅ Create wireframes/mockups for mobile layout
5. ✅ Start Phase 1 when ready

Good luck with your iOS app! Let me know when you're ready to begin the conversion process.
