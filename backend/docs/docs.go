package docs

import (
	"encoding/json"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"syscall"
)

type Config struct {
	DocsPath   string
	DocsDepth  int
	DefaultDoc string
}

type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	Type     string      `json:"type"`
	Owner    string      `json:"owner"`
	ModTime  string      `json:"modTime"`
	Children []*FileNode `json:"children,omitempty"`
}

func TreeHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		children := walk(config, "", 1)
		root := &FileNode{
			Name:     "root",
			Path:     "",
			Type:     "dir",
			Children: children,
		}

		json.NewEncoder(w).Encode(root)
	}
}

func ContentHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")

		relPath := r.URL.Query().Get("path")
		if relPath == "" {
			http.Error(w, "Path is required", http.StatusBadRequest)
			return
		}

		if strings.Contains(relPath, "..") {
			http.Error(w, "Invalid path", http.StatusBadRequest)
			return
		}

		fullPath := filepath.Join(config.DocsPath, relPath)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		lower := strings.ToLower(relPath)
		if !strings.HasSuffix(lower, ".md") {
			http.Error(w, "Forbidden: Only Markdown files are allowed", http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "text/markdown")
		w.Write(content)
	}
}

func walk(config Config, relPath string, currentDepth int) []*FileNode {
	if currentDepth > config.DocsDepth {
		return []*FileNode{}
	}

	fullPath := filepath.Join(config.DocsPath, relPath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return []*FileNode{}
	}

	var nodes []*FileNode
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}

		childRelPath := filepath.Join(relPath, name)
		if entry.IsDir() {
			if currentDepth >= config.DocsDepth {
				continue
			}
			if !hasMarkdownFiles(config, childRelPath) {
				continue
			}

			nodes = append(nodes, &FileNode{
				Name:     name,
				Path:     childRelPath,
				Type:     "dir",
				Children: walk(config, childRelPath, currentDepth+1),
			})
			continue
		}

		if strings.HasSuffix(strings.ToLower(name), ".md") {
			owner, modTime := getFileMetadata(filepath.Join(config.DocsPath, childRelPath))
			nodes = append(nodes, &FileNode{
				Name:    name,
				Path:    childRelPath,
				Type:    "file",
				Owner:   owner,
				ModTime: modTime,
			})
		}
	}

	sort.Slice(nodes, func(i, j int) bool {
		if config.DefaultDoc != "" {
			if nodes[i].Path == config.DefaultDoc {
				return true
			}
			if nodes[j].Path == config.DefaultDoc {
				return false
			}
		}
		if nodes[i].Type != nodes[j].Type {
			return nodes[i].Type == "file"
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})

	return nodes
}

func hasMarkdownFiles(config Config, relPath string) bool {
	fullPath := filepath.Join(config.DocsPath, relPath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}

		childRelPath := filepath.Join(relPath, name)
		if entry.IsDir() {
			if hasMarkdownFiles(config, childRelPath) {
				return true
			}
			continue
		}

		if strings.HasSuffix(strings.ToLower(name), ".md") {
			return true
		}
	}

	return false
}

func getFileMetadata(path string) (string, string) {
	info, err := os.Stat(path)
	if err != nil {
		return "--", "--"
	}

	modTime := info.ModTime().Format("2006-01-02 15:04")
	owner := "unknown"
	if stat, ok := info.Sys().(*syscall.Stat_t); ok {
		uid := strconv.Itoa(int(stat.Uid))
		u, err := user.LookupId(uid)
		if err == nil {
			owner = u.Username
		} else {
			owner = uid
		}
	}
	return owner, modTime
}
