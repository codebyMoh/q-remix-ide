import { compile, Warning } from "@/lib/compiler";

const FALLBACK_VERSIONS: { [key: string]: string } = {
  "0.8.0": "0.8.0+commit.c7dfd09e",
  "0.8.1": "0.8.1+commit.df193b15",
  "0.8.2": "0.8.2+commit.661d1103",
  "0.8.3": "0.8.3+commit.4a6a4d79",
  "0.8.4": "0.8.4+commit.c7e474f2",
  "0.8.5": "0.8.5+commit.a4f2e591",
  "0.8.6": "0.8.6+commit.11564f7e",
  "0.8.7": "0.8.7+commit.e28d00a7",
  "0.8.8": "0.8.8+commit.d4ff0e31",
  "0.8.9": "0.8.9+commit.e5eed63a",
  "0.8.10": "0.8.10+commit.fc410830",
  "0.8.11": "0.8.11+commit.d7f03943",
  "0.8.12": "0.8.12+commit.f00d7308",
  "0.8.13": "0.8.13+commit.abaa5c0e",
  "0.8.14": "0.8.14+commit.80d49f37",
  "0.8.15": "0.8.15+commit.e14f2714",
  "0.8.16": "0.8.16+commit.07a7930e",
  "0.8.17": "0.8.17+commit.8df45f5f",
  "0.8.18": "0.8.18+commit.87f61d96",
  "0.8.19": "0.8.19+commit.7dd6d404",
  "0.8.20": "0.8.20+commit.a1b79de6",
  "0.8.21": "0.8.21+commit.d9974bed",
  "0.8.22": "0.8.22+commit.4fc1097e",
  "0.8.23": "0.8.23+commit.f704f362",
  "0.8.24": "0.8.24+commit.e11b9ed9",
  "0.8.25": "0.8.25+commit.b61c2a91",
  "0.8.26": "0.8.26+commit.8a97fa7a",
  "0.8.27": "0.8.27+commit.40a35a09",
  "0.8.28": "0.8.28+commit.7893614a",
};

export interface CompilationTarget {
  [fileName: string]: { content: string };
}

export interface CompilerSettings {
  version?: string;
  language: string;
  evmVersion: string;
  optimize: boolean;
  runs: number;
}

export interface CompilationResult {
  success: boolean;
  data: any;
  errors?: any[];
  warnings?: Warning[];
}

export interface CompilerService {
  compile(targets: CompilationTarget, settings: CompilerSettings): Promise<CompilationResult>;
  validateSources(sources: CompilationTarget): boolean;
  getVersions(): Promise<string[]>;
  resolveImports(fileContent: string): Promise<any>;
  getCompatibleVersion(content: string): Promise<string>;
}

class RemixCompilerService implements CompilerService {
  private versionCache: string[] | null = null;

  async compile(
    targets: CompilationTarget,
    settings: CompilerSettings
  ): Promise<CompilationResult> {
    try {
      if (!targets || Object.keys(targets).length === 0) {
        throw new Error("No compilation targets provided");
      }

      const [fileName, fileData] = Object.entries(targets)[0];
      const content = fileData?.content;

      if (!content) throw new Error("No content provided for compilation");

      let warnings: Warning[] | undefined;
      const version = await this.getCompatibleVersion(content);

      const result = await compile(content, version, (w) => (warnings = w));

      return {
        success: true,
        data: result,
        warnings,
      };
    } catch (error) {
      console.error("Compilation error:", error);
      return {
        success: false,
        data: null,
        errors: [{ message: error.message }],
      };
    }
  }

  validateSources(sources: CompilationTarget): boolean {
    if (!sources || Object.keys(sources).length === 0) {
      return false;
    }
    for (const [fileName, { content }] of Object.entries(sources)) {
      if (!fileName.endsWith(".sol") || !content?.trim()) {
        return false;
      }
    }
    return true;
  }

  async getVersions(): Promise<string[]> {
    if (this.versionCache) {
      return this.versionCache;
    }
    try {
      const response = await fetch("https://binaries.soliditylang.org/bin/list.json");
      const data = await response.json();
      const allVersions = Object.keys(data.builds).map((key) =>
        data.builds[key].path.replace("soljson-v", "").replace(".js", "")
      );

      const majorVersions: string[] = [];
      const seenMinorVersions = new Set<string>();
      
      for (const version of allVersions) {
        const match = version.match(/^(\d+\.\d+\.\d+)/);
        if (match) {
          const minorVersion = match[1];
          if (minorVersion.startsWith("0.8.") && !seenMinorVersions.has(minorVersion)) {
            seenMinorVersions.add(minorVersion);
            majorVersions.push(version);
          }
        }
      }

      majorVersions.sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split("+")[0].split(".").map(Number);
        const [bMajor, bMinor, bPatch] = b.split("+")[0].split(".").map(Number);
        return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
      });

      this.versionCache = majorVersions;
      return majorVersions;
    } catch (error) {
      console.error("Error fetching versions, using fallback:", error);
      const fallbackVersions = Object.values(FALLBACK_VERSIONS);
;
      this.versionCache = fallbackVersions;
      return fallbackVersions;
    }
  }

  async getCompatibleVersion(content: string): Promise<string> {

    if (!content || typeof content !== "string") {
      console.warn("getCompatibleVersion: No valid content, defaulting to 0.8.19+commit.7dd6d404");
      return "0.8.19+commit.7dd6d404";
    }
    const pragmaMatch = content.match(/pragma\s+solidity\s+[^0-8]*(\d+\.\d+\.\d+)/);
    const requiredVersion = pragmaMatch ? pragmaMatch[1] : null;


    if (!requiredVersion) {
     
      return "0.8.19+commit.7dd6d404";
    }

  
    if (FALLBACK_VERSIONS[requiredVersion]) {

      return FALLBACK_VERSIONS[requiredVersion];
    }

    const versions = await this.getVersions();

    const compatible = versions.find((v) => v.startsWith(requiredVersion));

    if (compatible) {

      return compatible;
    }

    console.warn("getCompatibleVersion: No match found, defaulting to 0.8.19+commit.7dd6d404");
    return "0.8.19+commit.7dd6d404";
  }

  async resolveImports(fileContent: string): Promise<{ [path: string]: string }> {
    const importRegex = /import\s+["'](.+?)["'];/g;
    const imports: { [path: string]: string } = {};
    let match;

    while ((match = importRegex.exec(fileContent)) !== null) {
      const importPath = match[1];
      imports[importPath] = `// Mock content for ${importPath}`;
    }

    return imports;
  }
}

export const compilerService = new RemixCompilerService();