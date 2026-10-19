import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const repositoryRoot = process.cwd();
const certDir = join(repositoryRoot, "certificates");
const hostnameFile = join(certDir, ".hostname");
const socketPort = Number.parseInt(
  process.env.NEXT_PUBLIC_SOCKET_PORT || process.env.SOCKET_PORT || "4000",
  10,
);

const applications = [
  {
    id: "scc",
    label: "SCC archive",
    port: Number.parseInt(process.env.SCC_PORT || process.env.PORT || "2000", 10),
    root: join(repositoryRoot, "apps", "scc"),
  },
  {
    id: "goldfishes",
    label: "Goldfishes",
    port: Number.parseInt(process.env.GOLDFISHES_PORT || "2001", 10),
    root: join(repositoryRoot, "apps", "goldfishes"),
  },
  {
    id: "six-sigma",
    label: "six-sigma",
    port: Number.parseInt(process.env.SIX_SIGMA_PORT || "2002", 10),
    root: join(repositoryRoot, "apps", "six-sigma"),
  },
  {
    id: "xyt-cube",
    label: "xyt-cube",
    port: Number.parseInt(process.env.XYT_CUBE_PORT || "2003", 10),
    root: join(repositoryRoot, "apps", "xyt-cube"),
  },
  {
    id: "ddong-meong",
    label: "ddong-meong",
    port: Number.parseInt(process.env.DDONG_MEONG_PORT || "2010", 10),
    root: join(repositoryRoot, "apps", "ddong-meong"),
  },
  {
    id: "c-val",
    label: "C-VAL",
    port: Number.parseInt(process.env.C_VAL_PORT || "2011", 10),
    root: join(repositoryRoot, "apps", "c-val"),
  },
];

function selectedApplications(argv) {
  if (argv.includes("--all")) return applications;

  const appFlagIndex = argv.indexOf("--app");
  const selectedId = appFlagIndex === -1 ? "scc" : argv[appFlagIndex + 1];
  const selected = applications.find(({ id }) => id === selectedId);
  if (!selected) {
    const choices = applications.map(({ id }) => id).join(", ");
    throw new Error(`Unknown app "${selectedId}". Choose one of: ${choices}.`);
  }
  return [selected];
}

function assertValidPort(port, serviceName) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${serviceName} has invalid port ${port}.`);
  }
}

function assertPortAvailable(port, serviceName, host) {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `${serviceName} port ${port} is already in use on ${host}. Stop the existing development server or set a different port before running pnpm dev.`,
          ),
        );
        return;
      }
      reject(error);
    });

    probe.listen({ host, port, exclusive: true }, () => {
      probe.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

let selected;
try {
  selected = selectedApplications(process.argv.slice(2));
  assertValidPort(socketPort, "Socket.IO relay");
  for (const application of selected) {
    assertValidPort(application.port, application.label);
  }

  const usedPorts = new Map();
  for (const service of [
    ...selected.map(({ label, port }) => ({ label, port })),
    { label: "Socket.IO relay", port: socketPort },
  ]) {
    const existing = usedPorts.get(service.port);
    if (existing) {
      throw new Error(
        `${existing} and ${service.label} cannot both use port ${service.port}. Set a distinct app or socket port.`,
      );
    }
    usedPorts.set(service.port, service.label);
  }

  for (const [port, label] of usedPorts) {
    await assertPortAvailable(port, label, "0.0.0.0");
    await assertPortAvailable(port, label, "::");
  }
} catch (error) {
  console.error(`\n> ${error.message}\n`);
  process.exit(1);
}

const certResult = spawnSync("bash", ["scripts/generate-certs.sh"], {
  cwd: repositoryRoot,
  stdio: "inherit",
});

if (certResult.status !== 0) {
  process.exit(certResult.status ?? 1);
}

const devHostname = existsSync(hostnameFile)
  ? readFileSync(hostnameFile, "utf8").trim()
  : "localhost";

const localAppUrls = Object.fromEntries(
  applications.map(({ id, port }) => [id, `https://${devHostname}:${port}`]),
);

function spawnNext(application) {
  return spawn(
    "pnpm",
    [
      "exec",
      "next",
      "dev",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(application.port),
      "--experimental-https",
      "--experimental-https-key",
      join(certDir, "server.key"),
      "--experimental-https-cert",
      join(certDir, "server.pem"),
      "--experimental-https-ca",
      join(certDir, "rootCA.pem"),
    ],
    {
      cwd: application.root,
      stdio: "inherit",
      env: {
        ...process.env,
        C_VAL_APP_URL: process.env.C_VAL_APP_URL || localAppUrls["c-val"],
        C_VAL_PORT: String(applications.find(({ id }) => id === "c-val").port),
        DDONG_MEONG_APP_URL:
          process.env.DDONG_MEONG_APP_URL || localAppUrls["ddong-meong"],
        DDONG_MEONG_PORT: String(
          applications.find(({ id }) => id === "ddong-meong").port,
        ),
        GOLDFISHES_APP_URL:
          process.env.GOLDFISHES_APP_URL || localAppUrls.goldfishes,
        GOLDFISHES_PORT: String(
          applications.find(({ id }) => id === "goldfishes").port,
        ),
        NEXT_PUBLIC_DEV_HOSTNAME: devHostname,
        NEXT_PUBLIC_SOCKET_PORT: String(socketPort),
        PORT: String(application.port),
        SCC_PORT: String(applications.find(({ id }) => id === "scc").port),
      },
    },
  );
}

function spawnSocket() {
  return spawn("node", ["socket-server.mjs"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_HOSTNAME: devHostname,
      SOCKET_PORT: String(socketPort),
      PORT: String(socketPort),
    },
  });
}

const nextChildren = selected.map(spawnNext);
let socketChild = spawnSocket();
let stopping = false;
const relayRestartExitCode = 75;

console.log("");
for (const application of selected) {
  console.log(`> ${application.label}: ${localAppUrls[application.id]}`);
}
console.log(`> Socket relay: https://${devHostname}:${socketPort}`);
console.log(`> Root CA download for devices: https://${devHostname}:${socketPort}/cert`);
console.log("");

function stopAll(signal) {
  if (stopping) return;
  stopping = true;
  for (const child of [...nextChildren, socketChild]) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopAll(signal);
    process.exit(0);
  });
}

function stopHarness(code, signal) {
  if (stopping) return;
  stopAll(signal || "SIGTERM");
  process.exit(code ?? 0);
}

function watchSocket(child) {
  child.on("exit", (code, signal) => {
    if (stopping) return;
    if (code === relayRestartExitCode) {
      socketChild = spawnSocket();
      watchSocket(socketChild);
      return;
    }
    stopHarness(code, signal);
  });
}

for (const child of nextChildren) {
  child.on("exit", (code, signal) => stopHarness(code, signal));
}

watchSocket(socketChild);
