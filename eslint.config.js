import js from "@eslint/js";

export default [
  {
    ignores: [
      // Legacy scaffold files superseded by settings-dialog.tsx — kept for reference only
      "src/components/SettingsPage.tsx",
      "src/components/settings/ProfileSection.tsx",
      "src/components/settings/AccountSection.tsx",
      "src/components/settings/AppearanceSection.tsx",
      "src/components/settings/PrivacySection.tsx",
      "src/components/settings/SecuritySection.tsx",
      "src/components/settings/LibrarySection.tsx",
      "src/components/settings/LanguageSection.tsx",
      "src/components/settings/**/*",
    ],
  },

  js.configs.recommended,

  // ...the rest of your ESLint configuration
];
