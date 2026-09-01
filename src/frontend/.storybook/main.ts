import type { StorybookConfig } from '@storybook/react-vite'
import type { Plugin } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: (viteConfig) => {
    const plugins = (viteConfig.plugins ?? []).flat(Infinity).filter(Boolean) as Plugin[]
    viteConfig.plugins = plugins.filter((plugin) => !plugin.name.startsWith('vite-plugin-pwa'))

    return viteConfig
  },
}

export default config
