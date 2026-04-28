package main

import (
	"net"
	"strconv"
	"strings"
	"testing"
)

func TestListenWithFallback_BindsRequestedPortWhenAvailable(t *testing.T) {
	listener, port, err := listenWithFallback("0", 0, false)
	if err != nil {
		t.Fatalf("expected to bind ephemeral port, got error: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })

	if port <= 0 {
		t.Errorf("expected positive port number, got %d", port)
	}

	addr := listener.Addr().(*net.TCPAddr)
	if addr.Port == 0 {
		t.Error("listener bound to port 0 — expected a real ephemeral port")
	}
}

func TestListenWithFallback_FallsBackToNextPortWhenFirstIsTaken(t *testing.T) {
	first, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("could not reserve a port: %v", err)
	}
	t.Cleanup(func() { _ = first.Close() })
	taken := first.Addr().(*net.TCPAddr).Port

	second, port, err := listenWithFallback(strconv.Itoa(taken), 5, false)
	if err != nil {
		t.Fatalf("expected fallback to succeed, got: %v", err)
	}
	t.Cleanup(func() { _ = second.Close() })

	if port == taken {
		t.Errorf("expected fallback to a different port, but got the same: %d", port)
	}
	if port < taken || port > taken+5 {
		t.Errorf("expected port between %d and %d, got %d", taken+1, taken+5, port)
	}
}

func TestListenWithFallback_FailsImmediatelyWhenStrictAndPortTaken(t *testing.T) {
	first, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("could not reserve a port: %v", err)
	}
	t.Cleanup(func() { _ = first.Close() })
	taken := first.Addr().(*net.TCPAddr).Port

	listener, _, err := listenWithFallback(strconv.Itoa(taken), 10, true)
	if err == nil {
		_ = listener.Close()
		t.Fatal("expected strict mode to refuse fallback, but it succeeded")
	}
}

func TestListenWithFallback_RejectsInvalidPort(t *testing.T) {
	tests := []struct {
		name string
		port string
	}{
		{"non-numeric", "abc"},
		{"negative", "-1"},
		{"out-of-range", "70000"},
		{"empty", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			listener, _, err := listenWithFallback(tt.port, 0, false)
			if err == nil {
				_ = listener.Close()
				t.Fatalf("expected error for invalid port %q, got none", tt.port)
			}
			if !strings.Contains(err.Error(), "invalid port") {
				t.Errorf("expected 'invalid port' in error, got: %v", err)
			}
		})
	}
}
