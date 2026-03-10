/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind configuration for React Native
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom brand colors matching React Native Paper theme
        primary: {
          DEFAULT: '#1976D2',
          dark: '#115293',
          light: '#42A5F5',
        },
        secondary: {
          DEFAULT: '#DC004E',
          dark: '#9A0036',
          light: '#E33371',
        },
        tertiary: {
          DEFAULT: '#9C27B0',
          dark: '#6A1B9A',
          light: '#BA68C8',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
        
        // Background colors
        background: {
          light: '#FAFAFA',
          dark: '#121212',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E1E1E',
        },
        
        // Text colors
        text: {
          primary: '#212121',
          secondary: '#757575',
          disabled: '#BDBDBD',
          hint: '#9E9E9E',
        },
      },
      spacing: {
        // Custom spacing system (8px base)
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        // System fonts by platform
        sans: ['System'],
        // Add custom fonts here after loading them
      },
    },
  },
  plugins: [],
};

