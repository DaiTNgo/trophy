import { hydrateTranslations, upsertTranslations, hydrateAndResolveTranslations } from './catalog-translation'
import type { Locale } from './locale'
import type { Database } from '../db/client'

export async function hydrateCustomization(db: Database, customization: any) {
  if (!customization) return

  if (customization.formFields && customization.formFields.length > 0) {
    await hydrateTranslations(
      db,
      'customization_form_field',
      customization.formFields,
      (f: any) => String(f.id),
      [
        { fieldName: 'label', objectKey: 'label' },
        { fieldName: 'helpText', objectKey: 'helpText' },
        { fieldName: 'placeholder', objectKey: 'placeholder' }
      ],
      [
        { fieldName: 'label', objectKey: 'label' },
        { fieldName: 'helpText', objectKey: 'helpText' },
        { fieldName: 'placeholder', objectKey: 'placeholder' }
      ]
    )
  }

  if (customization.layers && customization.layers.length > 0) {
    const allOptions: any[] = []
    for (const layer of customization.layers) {
      if (layer.type === 'text') {
        if (layer.text.colorPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.colorPolicy.options) {
            o._id = `${layer.id}:color:${o.value}`
            allOptions.push(o)
          }
        }
        if (layer.text.fontPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.fontPolicy.options) {
            o._id = `${layer.id}:font:${o.value}`
            allOptions.push(o)
          }
        }
      }
    }
    
    if (allOptions.length > 0) {
      await hydrateTranslations(
        db,
        'customization_layer',
        allOptions,
        (o) => String(o._id),
        [{ fieldName: 'label', objectKey: 'label' }],
        [{ fieldName: 'label', objectKey: 'label' }]
      )
      
      for (const o of allOptions) {
        delete o._id
      }
    }
  }
}

export async function persistCustomizationTranslations(db: Database, customization: any) {
  if (!customization) return

  if (customization.formFields && customization.formFields.length > 0) {
    for (const field of customization.formFields) {
      if (field.label && typeof field.label === 'object' && field.label.vi !== undefined) {
        await upsertTranslations(db, 'customization_form_field', String(field.id), 'label', field.label)
        field.label = field.label.vi
      }
      if (field.helpText && typeof field.helpText === 'object' && field.helpText.vi !== undefined) {
        await upsertTranslations(db, 'customization_form_field', String(field.id), 'helpText', field.helpText)
        field.helpText = field.helpText.vi || null
      }
      if (field.placeholder && typeof field.placeholder === 'object' && field.placeholder.vi !== undefined) {
        await upsertTranslations(db, 'customization_form_field', String(field.id), 'placeholder', field.placeholder)
        field.placeholder = field.placeholder.vi || null
      }
    }
  }

  if (customization.layers && customization.layers.length > 0) {
    for (const layer of customization.layers) {
      if (layer.type === 'text') {
        if (layer.text.colorPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.colorPolicy.options) {
            if (o.label && typeof o.label === 'object' && o.label.vi !== undefined) {
              await upsertTranslations(db, 'customization_layer', `${layer.id}:color:${o.value}`, 'label', o.label)
              o.label = o.label.vi
            }
          }
        }
        if (layer.text.fontPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.fontPolicy.options) {
            if (o.label && typeof o.label === 'object' && o.label.vi !== undefined) {
              await upsertTranslations(db, 'customization_layer', `${layer.id}:font:${o.value}`, 'label', o.label)
              o.label = o.label.vi
            }
          }
        }
      }
    }
  }
}

export async function hydrateAndResolveCustomization(db: Database, customization: any, locale: Locale) {
  if (!customization) return

  if (customization.formFields && customization.formFields.length > 0) {
    await hydrateAndResolveTranslations(
      db,
      'customization_form_field',
      customization.formFields,
      (f: any) => String(f.id),
      [
        { fieldName: 'label', objectKey: 'label' },
        { fieldName: 'helpText', objectKey: 'helpText' },
        { fieldName: 'placeholder', objectKey: 'placeholder' }
      ],
      [
        { fieldName: 'label', objectKey: 'label' },
        { fieldName: 'helpText', objectKey: 'helpText' },
        { fieldName: 'placeholder', objectKey: 'placeholder' }
      ],
      locale
    )
  }

  if (customization.layers && customization.layers.length > 0) {
    const allOptions: any[] = []
    for (const layer of customization.layers) {
      if (layer.type === 'text') {
        if (layer.text.colorPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.colorPolicy.options) {
            o._id = `${layer.id}:color:${o.value}`
            allOptions.push(o)
          }
        }
        if (layer.text.fontPolicy?.mode === 'shopper_selectable') {
          for (const o of layer.text.fontPolicy.options) {
            o._id = `${layer.id}:font:${o.value}`
            allOptions.push(o)
          }
        }
      }
    }
    
    if (allOptions.length > 0) {
      await hydrateAndResolveTranslations(
        db,
        'customization_layer',
        allOptions,
        (o) => String(o._id),
        [{ fieldName: 'label', objectKey: 'label' }],
        [{ fieldName: 'label', objectKey: 'label' }],
        locale
      )
      
      for (const o of allOptions) {
        delete o._id
      }
    }
  }
}
