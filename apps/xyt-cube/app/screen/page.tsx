import { xytCubeNavigationExperiments } from "@/components/experiments";
import XytCubeNavigation from "@/foundations/navigation";

export default function ScreenIndexPage() {
  return (
    <XytCubeNavigation
      experiments={xytCubeNavigationExperiments.filter((item) => item.key.startsWith("screen/"))}
      scope="screen"
    />
  );
}
