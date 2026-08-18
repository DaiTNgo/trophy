import { Hono } from 'hono'
import type { AppEnv } from '../../lib/env'
import { productAtomicVariantCreateRoute } from './product-atomic-variant-create-route'
import { productCommandRoute } from './product-command-route'
import { productContentRoute } from './product-content-route'
import { productCustomizationLifecycleRoute } from './product-customization-lifecycle-route'
import { productCustomizationRoute } from './product-customization-route'
import { productLifecycleRoute } from './product-lifecycle-route'
import { productOptionDefinitionRoute } from './product-option-definition-route'
import { productOptionReplacementRoute } from './product-option-replacement-route'
import { productOptionValueRoute } from './product-option-value-route'
import { productQueryRoute } from './product-query-route'
import { productVariantBatchRoute } from './product-variant-batch-route'
import { productVariantDeleteRoute } from './product-variant-delete-route'
import { productVariantDetailRoute } from './product-variant-detail-route'
import { productVariantMediaRoute } from './product-variant-media-route'
import { productVariantMediaManagementRoute } from './product-variant-media-management-route'
import { productVariantMisaRoute } from './product-variant-misa-route'

export const productsRoute = new Hono<AppEnv>()
  .route('/', productQueryRoute)
  .route('/', productCommandRoute)
  .route('/', productContentRoute)
  .route('/', productOptionDefinitionRoute)
  .route('/', productOptionValueRoute)
  .route('/', productOptionReplacementRoute)
  .route('/', productVariantBatchRoute)
  .route('/', productVariantDetailRoute)
  .route('/', productVariantDeleteRoute)
  .route('/', productVariantMisaRoute)
  .route('/', productAtomicVariantCreateRoute)
  .route('/', productVariantMediaRoute)
  .route('/', productVariantMediaManagementRoute)
  .route('/', productCustomizationRoute)
  .route('/', productCustomizationLifecycleRoute)
  .route('/', productLifecycleRoute)
