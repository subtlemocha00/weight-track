import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimalPreset,
    maskable: {
      sizes: [512],
      padding: 0.1,
    },
    apple: {
      sizes: [180],
      padding: 0.1,
    },
  },
  images: ['public/logo.svg'],
})
