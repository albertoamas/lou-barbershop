import type { Preview } from '@storybook/react-vite'
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/public-sans/wght.css'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
}

export default preview
