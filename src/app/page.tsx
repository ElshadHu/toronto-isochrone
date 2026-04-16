import { Sidebar } from '@/components/sidebar/Sidebar'
import { MapWrapper } from '@/components/map/MapWrapper'
import { StationLoader } from '@/components/map/StationLoader'

export default function Home(): React.ReactElement {
  return (
    <div className="flex h-full flex-col-reverse md:flex-row">
      <Sidebar />
      <main className="min-h-0 flex-1">
        <StationLoader />
        <MapWrapper />
      </main>
    </div>
  )
}
