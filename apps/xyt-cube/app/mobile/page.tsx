import { xytCubeNavigationExperiments } from "@/components/experiments";
import XytCubeNavigation from "@/foundations/navigation";

export default function MobileIndexPage() {
  return (
    <XytCubeNavigation
      experiments={xytCubeNavigationExperiments.filter((item) => item.key.startsWith("mobile/"))}
      scope="mobile"
    />
  );
}
