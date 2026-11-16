package app

import "io/fs"

func mustSub() fs.FS {
	f, e := fs.Sub(migrations, "migrations")
	if e != nil {
		panic(e)
	}
	return f
}
