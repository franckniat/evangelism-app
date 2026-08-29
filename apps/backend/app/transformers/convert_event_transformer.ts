import type ConvertEvent from '#models/convert_event'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ConvertEventTransformer extends BaseTransformer<ConvertEvent> {
  toObject() {
    const event = this.resource

    return {
      id: event.id,
      type: event.type,
      text: event.text,
      createdAt: event.createdAt?.toISO() ?? null,
    }
  }
}
