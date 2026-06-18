package mcp

import (
	"crypto/rand"
)

// nanoid alphabet matches the frontend's `nanoid` default (A-Za-z0-9_-), so
// location IDs minted by the MCP tools are visually indistinguishable from the
// ones the web UI generates.
const nanoidAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict"

const nanoidLen = 21

// newID returns a URL-safe random identifier of nanoidLen characters.
func newID() string {
	buf := make([]byte, nanoidLen)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand should never fail; if it does, panicking is preferable to
		// minting a predictable or empty ID.
		panic("mcp: failed to read random bytes: " + err.Error())
	}
	id := make([]byte, nanoidLen)
	for i, b := range buf {
		id[i] = nanoidAlphabet[int(b)&63]
	}
	return string(id)
}
