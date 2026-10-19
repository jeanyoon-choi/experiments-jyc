import { notFound } from "next/navigation";
import {
  findXytCubeExperiment,
  xytCubeNavigationExperiments,
} from "@/components/experiments";
import XytCubeNavigation from "@/foundations/navigation";
import { getXytCubeArchive } from "@/foundations/navigation/archive";

export default async function ScreenExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;

  if (path.length === 1) {
    const experiments = xytCubeNavigationExperiments.filter(
      (item) => getXytCubeArchive(item) === `screen/${path[0]}`,
    );
    if (experiments.length === 0) notFound();

    return (
      <XytCubeNavigation
        experiments={experiments}
        scope="screen"
        archiveDate={path[0]}
      />
    );
  }

  const entry = findXytCubeExperiment(["screen", ...path]);
  if (!entry || !entry.key.startsWith("screen/")) notFound();

  const { default: Screen } = await entry.load();
  return <Screen />;
}
