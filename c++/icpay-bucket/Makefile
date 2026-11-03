CXX ?= clang++
SYSROOT ?= $(shell if [ -d /Library/Developer/CommandLineTools/SDKs/MacOSX15.sdk ]; then echo "-isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX15.sdk"; fi)
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Iinclude $(SYSROOT)
LDFLAGS ?= $(SYSROOT) -lcurl

SRC = src/client.cpp src/files.cpp src/error.cpp src/url.cpp
OBJ = $(SRC:.cpp=.o)
LIB = libicbucket_cpp.a

all: $(LIB) test_runner

$(LIB): $(OBJ)
	ar rcs $@ $^

src/%.o: src/%.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

test_runner: test/test_client.cpp $(LIB)
	$(CXX) $(CXXFLAGS) $< -L. -licbucket_cpp $(LDFLAGS) -o $@

test: test_runner
	./test_runner

clean:
	rm -f src/*.o $(LIB) test_runner

.PHONY: all clean test
