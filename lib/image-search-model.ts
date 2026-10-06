/**
 * The photo-search model contract. The customer's browser
 * (components/ImageSearchButton) and the catalogue index
 * (admin/scripts/build-image-search-index.ts → data/image-search-index.json)
 * MUST use exactly this model and dtype, or fingerprints aren't comparable.
 *
 * fp16, not the smaller 8-bit "q8": q8 matched the right product type only 13%
 * of the time against fp16's 80%.
 */
export const IMAGE_MODEL_ID = 'Xenova/mobileclip_s0';
export const IMAGE_MODEL_DTYPE = 'fp16';
