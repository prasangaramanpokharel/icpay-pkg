CC ?= clang
SYSROOT ?= $(shell if [ -d /Library/Developer/CommandLineTools/SDKs/MacOSX15.sdk ]; then echo "-isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX15.sdk"; fi)
CFLAGS ?= -std=c11 -Wall -Wextra -Iinclude $(SYSROOT)
LDFLAGS ?= $(SYSROOT) -lcurl

SRC = src/icbucket.c src/url.c src/error.c
OBJ = $(SRC:.c=.o)
LIB = libicbucket.a

all: $(LIB) test_runner

$(LIB): $(OBJ)
	ar rcs $@ $^

src/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@

test_runner: test/test_icbucket.c $(LIB)
	$(CC) $(CFLAGS) $< -L. -licbucket $(LDFLAGS) -o $@

test: test_runner
	./test_runner

clean:
	rm -f src/*.o $(LIB) test_runner

.PHONY: all clean test
