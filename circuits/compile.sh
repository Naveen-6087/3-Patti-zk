#!/bin/bash
# ============================================================
# ZK Teen Patti - Circuit Compilation Pipeline
# Compatible with: Noir v1.0.0-beta.6 | bb v0.84.0
# Target: zkVerify UltraHonk (Keccak, ZK variant)
# ============================================================
# Usage (run from WSL):
#   cd teen-patti/3-Patti-zk/circuits
#   chmod +x compile.sh
#   ./compile.sh [compile|prove|verify|vk|solidity|hex|all]
# ============================================================

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration
readonly NOIR_VERSION="1.0.0-beta.6"
readonly BB_VERSION="0.84.0"

# Circuit names (must match Nargo.toml package names)
readonly CIRCUITS=("shuffle_circuit" "deal_circuit" "show_circuit")

# Logging
log_info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}✅${NC} $*"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $*"; }

error_exit() { log_error "$1"; exit "${2:-1}"; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

# ============================================================
# Step 0: Version management
# ============================================================
update_versions() {
    log_step "Updating toolchain versions..."

    if ! command_exists noirup; then
        error_exit "noirup not found. Install: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash"
    fi
    if ! command_exists bbup; then
        error_exit "bbup not found. Install: curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install | bash"
    fi

    noirup --version "${NOIR_VERSION}" || error_exit "Failed to set Noir version"
    log_info "Noir: $(nargo --version 2>/dev/null || echo 'unknown')"

    bbup -v "${BB_VERSION}" || error_exit "Failed to set bb version"
    log_info "bb: $(bb --version 2>/dev/null || echo 'unknown')"
}

# ============================================================
# Step 1: Compile all circuits
# ============================================================
compile_circuits() {
    log_step "Compiling all circuits..."
    nargo compile --workspace || error_exit "Compilation failed"

    # Verify compiled artifacts exist
    for circuit in "${CIRCUITS[@]}"; do
        if [[ ! -f "target/${circuit}.json" ]]; then
            error_exit "Expected target/${circuit}.json not found after compilation"
        fi
        log_info "  ✓ target/${circuit}.json"
    done

    log_success "All circuits compiled successfully"
}

# ============================================================
# Step 2: Run tests
# ============================================================
run_tests() {
    log_step "Running circuit tests..."
    nargo test --workspace || error_exit "Tests failed"
    log_success "All tests passed"
}

# ============================================================
# Step 3: Generate verification keys (for zkVerify - Keccak)
# ============================================================
generate_vks() {
    log_step "Generating verification keys (UltraHonk + Keccak)..."
    mkdir -p target

    for circuit in "${CIRCUITS[@]}"; do
        if [[ ! -f "target/${circuit}.json" ]]; then
            log_warn "target/${circuit}.json not found, skipping VK generation"
            continue
        fi

        log_info "  Generating VK for ${circuit}..."
        mkdir -p "target/${circuit}_vk"
        bb write_vk \
            -s ultra_honk \
            -b "target/${circuit}.json" \
            -o "target/${circuit}_vk" \
            --oracle_hash keccak || error_exit "VK generation failed for ${circuit}"

        log_info "  ✓ target/${circuit}_vk"
    done

    log_success "All verification keys generated"
}

# ============================================================
# Step 4: Generate Solidity verifiers
# ============================================================
generate_solidity_verifiers() {
    log_step "Generating Solidity verifier contracts..."
    mkdir -p target/verifiers

    for circuit in "${CIRCUITS[@]}"; do
        local vk_path="target/${circuit}_vk/vk"
        if [[ ! -f "${vk_path}" ]]; then
            # Try alternative path (bb might output directly)
            vk_path="target/${circuit}_vk"
            if [[ ! -f "${vk_path}" ]]; then
                log_warn "VK not found for ${circuit}, skipping Solidity verifier"
                continue
            fi
        fi

        log_info "  Generating Solidity verifier for ${circuit}..."

        # Try write_solidity_verifier first (newer bb versions)
        # Fall back to contract command (older bb versions)
        if bb write_solidity_verifier -k "${vk_path}" -o "target/verifiers/${circuit}Verifier.sol" 2>/dev/null; then
            log_info "  ✓ target/verifiers/${circuit}Verifier.sol"
        elif bb contract -b "target/${circuit}.json" -o "target/verifiers/${circuit}Verifier.sol" 2>/dev/null; then
            log_info "  ✓ target/verifiers/${circuit}Verifier.sol (via contract cmd)"
        else
            log_warn "  Solidity verifier generation failed for ${circuit} - check bb --help for available commands"
        fi
    done

    log_success "Solidity verifier generation complete"
}

# ============================================================
# Step 5: Generate witness + proof for testing
# ============================================================
generate_test_proofs() {
    log_step "Generating test proofs (ZK + Keccak)..."

    for circuit in "${CIRCUITS[@]}"; do
        if [[ ! -f "target/${circuit}.json" ]]; then
            log_warn "target/${circuit}.json not found, skipping"
            continue
        fi

        # Execute circuit if witness doesn't exist
        if [[ ! -f "target/${circuit}.gz" ]]; then
            log_info "  Executing ${circuit} to generate witness..."
            nargo execute --package "${circuit}" || error_exit "Execution failed for ${circuit}"
        fi

        log_info "  Generating proof for ${circuit}..."
        mkdir -p "target/${circuit}_proof"
        bb prove \
            -s ultra_honk \
            -b "target/${circuit}.json" \
            -w "target/${circuit}.gz" \
            -o "target/${circuit}_proof" \
            --oracle_hash keccak \
            --zk || error_exit "Proof generation failed for ${circuit}"

        log_info "  ✓ target/${circuit}_proof"
    done

    log_success "Test proof generation complete"
}

# ============================================================
# Step 6: Verify proofs locally
# ============================================================
verify_proofs() {
    log_step "Verifying proofs locally..."

    for circuit in "${CIRCUITS[@]}"; do
        local proof_path="target/${circuit}_proof/proof"
        local vk_path="target/${circuit}_vk/vk"

        # Try alternative paths
        if [[ ! -f "${proof_path}" ]]; then
            proof_path="target/${circuit}_proof"
        fi
        if [[ ! -f "${vk_path}" ]]; then
            vk_path="target/${circuit}_vk"
        fi

        if [[ ! -f "${proof_path}" ]] || [[ ! -f "${vk_path}" ]]; then
            log_warn "Proof or VK not found for ${circuit}, skipping verification"
            continue
        fi

        log_info "  Verifying ${circuit}..."
        bb verify -p "${proof_path}" -k "${vk_path}" || error_exit "Verification failed for ${circuit}"
        log_info "  ✓ ${circuit} verified"
    done

    log_success "All proofs verified locally"
}

# ============================================================
# Step 7: Convert artifacts to hex for zkVerify
# ============================================================
convert_to_hex() {
    log_step "Converting artifacts to hex for zkVerify..."
    mkdir -p target/zkverify

    for circuit in "${CIRCUITS[@]}"; do
        local proof_path="target/${circuit}_proof/proof"
        local vk_path="target/${circuit}_vk/vk"
        local pubs_path="target/${circuit}_proof/public_inputs"

        # Try alternative paths
        if [[ ! -f "${proof_path}" ]]; then proof_path="target/${circuit}_proof"; fi
        if [[ ! -f "${vk_path}" ]]; then vk_path="target/${circuit}_vk"; fi

        # Convert VK to hex
        if [[ -f "${vk_path}" ]]; then
            printf '"0x%s"\n' "$(xxd -p -c 0 "${vk_path}")" > "target/zkverify/${circuit}_vk.hex"
            log_info "  ✓ target/zkverify/${circuit}_vk.hex"
        fi

        # Convert proof to hex (ZK variant wrapper)
        if [[ -f "${proof_path}" ]]; then
            local proof_bytes
            proof_bytes=$(xxd -p -c 256 "${proof_path}" | tr -d '\n')
            printf '{\n    "ZK": "0x%s"\n}\n' "${proof_bytes}" > "target/zkverify/${circuit}_proof.hex"
            log_info "  ✓ target/zkverify/${circuit}_proof.hex"
        fi

        # Convert public inputs to hex (32-byte chunks)
        if [[ -f "${pubs_path}" ]]; then
            xxd -p -c 32 "${pubs_path}" | \
                sed 's/.*/"0x&"/' | \
                paste -sd, - | \
                sed 's/.*/[&]/' > "target/zkverify/${circuit}_pubs.hex"
            log_info "  ✓ target/zkverify/${circuit}_pubs.hex"
        fi
    done

    log_success "Hex conversion complete"
}

# ============================================================
# Step 8: Copy artifacts to frontend
# ============================================================
copy_to_frontend() {
    log_step "Copying circuit artifacts to frontend/public/circuits/..."
    local frontend_dir="../frontend/public/circuits"
    mkdir -p "${frontend_dir}"

    for circuit in "${CIRCUITS[@]}"; do
        if [[ -f "target/${circuit}.json" ]]; then
            cp "target/${circuit}.json" "${frontend_dir}/"
            log_info "  ✓ ${circuit}.json"
        fi

        # Copy VK if available
        local vk_path="target/${circuit}_vk/vk"
        if [[ ! -f "${vk_path}" ]]; then vk_path="target/${circuit}_vk"; fi
        if [[ -f "${vk_path}" ]]; then
            cp "${vk_path}" "${frontend_dir}/${circuit}_vk"
            log_info "  ✓ ${circuit}_vk"
        fi
    done

    log_success "Frontend artifacts copied"
}

# ============================================================
# Main
# ============================================================
main() {
    local action="${1:-all}"

    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║     ZK Teen Patti - Circuit Build Pipeline       ║"
    echo "║     Noir ${NOIR_VERSION} | bb ${BB_VERSION}              ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""

    case "${action}" in
        versions)  update_versions ;;
        compile)   compile_circuits ;;
        test)      run_tests ;;
        vk)        generate_vks ;;
        solidity)  generate_solidity_verifiers ;;
        prove)     generate_test_proofs ;;
        verify)    verify_proofs ;;
        hex)       convert_to_hex ;;
        frontend)  copy_to_frontend ;;
        all)
            update_versions
            compile_circuits
            run_tests
            generate_vks
            generate_solidity_verifiers
            copy_to_frontend
            log_success "Full pipeline complete!"
            ;;
        test-e2e)
            compile_circuits
            run_tests
            generate_vks
            generate_test_proofs
            verify_proofs
            convert_to_hex
            log_success "End-to-end test pipeline complete!"
            ;;
        *)
            echo "Usage: $0 [versions|compile|test|vk|solidity|prove|verify|hex|frontend|all|test-e2e]"
            echo ""
            echo "  versions  - Update Noir and bb toolchain versions"
            echo "  compile   - Compile all circuits"
            echo "  test      - Run circuit tests"
            echo "  vk        - Generate verification keys"
            echo "  solidity  - Generate Solidity verifier contracts"
            echo "  prove     - Generate test proofs"
            echo "  verify    - Verify proofs locally"
            echo "  hex       - Convert artifacts to hex for zkVerify"
            echo "  frontend  - Copy artifacts to frontend"
            echo "  all       - Run full pipeline (compile → test → vk → solidity → frontend)"
            echo "  test-e2e  - End-to-end test (compile → test → vk → prove → verify → hex)"
            exit 1
            ;;
    esac
}

main "$@"
