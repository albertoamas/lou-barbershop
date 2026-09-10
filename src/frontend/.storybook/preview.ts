import type { Preview } from '@storybook/react-vite'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
}

export default preview
