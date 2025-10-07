type TascEnvironment = "development" | "production" | "staging" | "test";

type ConfigOptions = {
  api_doc_url?: string;
  environment?: TascEnvironment;
  poll_interval_ms?: number;
  outputs: {
    base_path?: string;
    dir?: string;
    api_types?: string;
    api_operations?: string;
    doc_file?: string;
    export_path?: string;
  };
};

export type { ConfigOptions, TascEnvironment };
