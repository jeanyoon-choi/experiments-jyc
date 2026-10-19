import { notFound } from "next/navigation";
import {
  findXytCubeExperiment,
  xytCubeNavigationExperiments,
} from "@/components/experiments";
import XytCubeNavigation from "@/foundations/navigation";
import { getXytCubeArchive } from "@/foundations/navigation/archive";

export default async function MobileExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;

  if (path.length === 1) {
    const experiments = xytCubeNavigationExperiments.filter(
      (item) => getXytCubeArchive(item) === `mobile/${path[0]}`,
    );
    if (experiments.length === 0) notFound();

    return (
      <XytCubeNavigation
        experiments={experiments}
        scope="mobile"
        archiveDate={path[0]}
      />
    );
  }

  const entry = findXytCubeExperiment(["mobile", ...path]);
  if (!entry || !entry.key.startsWith("mobile/")) notFound();

  const { default: Mobile } = await entry.load();
  return <Mobile />;
}
