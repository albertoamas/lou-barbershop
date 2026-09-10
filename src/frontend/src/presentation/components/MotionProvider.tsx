import { LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
    <LazyMotion
      features={() => import('../motionFeatures').then((module) => module.default)}
      strict
    >
      {children}
    </LazyMotion>
  </MotionConfig>
)
