import { Sidebar } from '@/components/sidebar/Sidebar'
import { MapWrapper } from '@/components/map/MapWrapper'
import { StationLoader } from '@/components/map/StationLoader'

export default function Home(): React.ReactElement {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <main className="h-full w-full">
        <StationLoader />
        <MapWrapper />
      </main>
      <Sidebar />
    </div>
  )
}
