package main

import (
	"fmt"
	"net"
	"strconv"
)

// listenWithFallback binds a TCP listener to the requested port. When strict is
// false and the requested port cannot be bound (typically because it's already
// in use), it tries the next `retries` ports before giving up. When strict is
// true (the user explicitly set PORT), it fails immediately rather than
// silently using a different port.
//
// Returns the bound listener and the port number actually in use, which is
// read back from the listener after binding so that ":0" requests reflect the
// kernel-assigned ephemeral port.
func listenWithFallback(portStr string, retries int, strict bool) (net.Listener, int, error) {
	port, err := strconv.Atoi(portStr)
	if err != nil || port < 0 || port > 65535 {
		return nil, 0, fmt.Errorf("invalid port %q", portStr)
	}

	var lastErr error
	for i := 0; i <= retries; i++ {
		candidate := port + i
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", candidate))
		if err == nil {
			actual := candidate
			if tcpAddr, ok := listener.Addr().(*net.TCPAddr); ok {
				actual = tcpAddr.Port
			}
			return listener, actual, nil
		}
		lastErr = err

		if strict {
			return nil, port, err
		}
	}
	return nil, port, fmt.Errorf("ports %d-%d unavailable: %w", port, port+retries, lastErr)
}
