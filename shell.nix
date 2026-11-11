let
  # unstable channel pinned to ``26.11pre-git''
  # check with:
  #   nix eval --impure --expr '(import (fetchTarball { url = "https://github.com/NixOS/nixpkgs/archive/2c423e03bbafcff28bfadc6781a4a8257f205cb5.tar.gz"; sha256 = "0sncav0zwd301731dh1pqdfgwiak5af6b5gg178wy0zcrdsidpkn"; }) {}).lib.version'
  #          -tmorres  Aug 22, 2026 | 22:10
  pkgs = import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/2c423e03bbafcff28bfadc6781a4a8257f205cb5.tar.gz";
    sha256 = "0sncav0zwd301731dh1pqdfgwiak5af6b5gg178wy0zcrdsidpkn";
    # the `url' field were determined by:
    #   git ls-remote https://github.com/NixOS/nixpkgs nixos-unstable
    # and `sha256' were determined by unpacking nixos-unstable
    # with the following command:
    #   nix-prefetch-url --unpack https://github.com/NixOS/nixpkgs/archive/refs/heads/nixos-unstable.tar.gz
    #          -tmorres  Aug 22, 2026 | 22:10
  }) {};
  lib = pkgs.lib;

  # Package Lists
  base = with pkgs; [
    deno
    fish
  ];
  # optional = with pkgs; [
  #   another-package
  # ];
in

pkgs.mkShell {
  buildInputs = lib.concatLists [
    base
    # optional
  ];

  # nix  wraps `ld` with a script that enforces purity, breaking
  # the  linking  process  while  `ld`  tries  to access foreign
  # binaries. The ONLY solution is to disable the enforcement.
  #         -tmorres Aug 24, 2026 | 16:46
  NIX_ENFORCE_PURITY = 0;

  shellHook = ''
    exec fish
  '';
}
