
# Schedule Line Reminder Project Rules

## Directory Structure

### Root Directories
- `__tests__/`: Testing files
- `src/`: Application code files

### Source Code Structure (`src/`)
- `handlers/`: AWS Lambda handler files
  - Purpose: Entry points for AWS Lambda functions
  - Naming: `*-handler.ts`
  - Required: Initialize Config with `Config.getInstance().init(parameterFetcher)`

- `lib/`: Library files
  - Purpose: Reusable utility functions and classes
  - Naming: `*-adapter.ts` for external service adapters

- `types/`: Type definition files
  - Extension: `.d.ts`
  - Rule: Use `type` instead of `interface`
  - Naming: `Schema$` prefix for service interfaces
  - Example: `Schema$GoogleAuth`, `Schema$LineMessagingApiClient`

- `usecases/`: Application logic files
  - Purpose: Core business logic implementation
  - Naming: `*-usecase.ts`
  - Pattern: Dependency Injection through constructor

## Implementation Guidelines

### External Service Integration
- API clients should be implemented in `*ApiClient` classes
- Example: `GoogleCalendarApiClient`, `LineMessagingApiClient`
- Use adapters for external service integration

### Dependency Injection
- UseCase classes should receive dependencies through constructor
- Dependencies should be defined as types/interfaces
- Implementation classes should be injected from outside

### Configuration
- Initialize Config at the start of handler execution
- Required code: `Config.getInstance().init(parameterFetcher)`
- Use `AwsParameterFetcher` for production
- Use `ParameterFetcherMock` for testing

## Testing Guidelines

### Test Configuration
- Use `ParameterFetcherMock` for config in tests
- Command: `bun run test` to run all tests

### Test Structure
- Test files should be in `__tests__/` directory
- Mock files should be in `__tests__/mocks/` directory
- Test naming: `*.test.ts`
