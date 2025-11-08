package static

import (
	"embed"
	"io/fs"
)

//go:embed all:files
var Files embed.FS

// GetFS returns a filesystem interface for the static files
func GetFS() (fs.FS, error) {
	return fs.Sub(Files, "files")
}
