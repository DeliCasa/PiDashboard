{
  description = "PiDashboard development environment with Playwright support for NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            playwright-driver.browsers
          ];

          shellHook = ''
            # Playwright browser configuration for NixOS
            # IMPORTANT: @playwright/test version in package.json must match nixpkgs version
            # package.json: ^1.57.0, nixpkgs-unstable provides compatible version
            # Run `nix flake update` if version mismatch errors occur
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

            echo "╔════════════════════════════════════════════════════════════╗"
            echo "║          PiDashboard Development Environment               ║"
            echo "╠════════════════════════════════════════════════════════════╣"
            echo "║ Node.js: $(node --version)"
            echo "║ Playwright browsers: $PLAYWRIGHT_BROWSERS_PATH"
            echo "║"
            echo "║ Quick commands:"
            echo "║   npm run test          - Run unit/component tests"
            echo "║   npm run test:e2e      - Run E2E tests (Playwright)"
            echo "║   npm run test:coverage - Run tests with coverage"
            echo "╚════════════════════════════════════════════════════════════╝"
          '';
        };
      });
}
