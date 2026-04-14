import { createWriteStream, mkdirSync, existsSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import * as path from 'node:path'
import AdmZip from 'adm-zip'
import { z } from 'zod'

const DATA_DIR = path.resolve(process.cwd(), 'valhalla_data')
const RAW_DIR = path.join(DATA_DIR, 'raw_gtfs')
const ZIP_OUTPUT_PATH = path.join(RAW_DIR, 'ttc-gtfs.zip')

const CkanResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    resources: z.array(
      z.object({
        format: z.string(),
        url: z.string(),
      })
    ),
  }),
})

export async function fetchAndUnzipGtfs(): Promise<void> {
  // 1. Ensure target directories exist
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true })
  }

  console.log('Fetching CKAN metadata for TTC GTFS...')

  // 2. Safely get the download URL from the CKAN API
  const ckanUrl =
    'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=ttc-routes-and-schedules'

  const response = await fetch(ckanUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch CKAN metadata: ${response.statusText}`)
  }

  const rawJson: unknown = await response.json()
  const parsedCkan = CkanResponseSchema.safeParse(rawJson)

  if (!parsedCkan.success) {
    console.error(parsedCkan.error.format())
    throw new TypeError('Invalid CKAN API response structure.')
  }

  const zipResource = parsedCkan.data.result.resources.find(
    (res) => res.format.toUpperCase() === 'ZIP'
  )

  if (!zipResource) {
    throw new Error('Could not locate a ZIP resource in the CKAN metadata.')
  }

  console.log(`Downloading GTFS Payload from: ${zipResource.url}...`)

  // 3. Download the zipped stream
  const zipResponse = await fetch(zipResource.url)
  if (!zipResponse.ok || !zipResponse.body) {
    throw new Error(`Failed to download ZIP: ${zipResponse.statusText}`)
  }

  // 4. Pipe seamlessly to disk to avoid buffering massive files in RAM
  const webStream = zipResponse.body
  if (!webStream) {
    throw new Error('Response body is null, cannot pipe stream.')
  }
  const nodeStream = Readable.fromWeb(webStream as import('stream/web').ReadableStream)

  const fileStream = createWriteStream(ZIP_OUTPUT_PATH)
  await pipeline(nodeStream, fileStream)

  console.log(`Download complete: ${ZIP_OUTPUT_PATH}`)

  // 5. Unzip utilizing AdmZip cleanly
  console.log('Extracting GTFS files...')
  const zip = new AdmZip(ZIP_OUTPUT_PATH)

  // Extract strictly to RAW_DIR
  zip.extractAllTo(RAW_DIR, true)

  console.log(`Extraction successful to: ${RAW_DIR}`)
}

// Execute if run directly
if (require.main === module) {
  fetchAndUnzipGtfs().catch((err: unknown) => {
    console.error('Fatal Error occurred securely:')
    if (err instanceof Error) {
      console.error(err.message)
    } else {
      console.error(err)
    }
    process.exit(1)
  })
}
