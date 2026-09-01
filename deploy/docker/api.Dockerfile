FROM mcr.microsoft.com/dotnet/sdk:10.0.400 AS build
WORKDIR /source

COPY global.json Directory.Build.props .editorconfig LouBarbershop.slnx ./
COPY src/backend/LouBarbershop.Domain/*.csproj src/backend/LouBarbershop.Domain/
COPY src/backend/LouBarbershop.Application/*.csproj src/backend/LouBarbershop.Application/
COPY src/backend/LouBarbershop.Infrastructure/*.csproj src/backend/LouBarbershop.Infrastructure/
COPY src/backend/LouBarbershop.Api/*.csproj src/backend/LouBarbershop.Api/
COPY tests/backend/LouBarbershop.Domain.Tests/*.csproj tests/backend/LouBarbershop.Domain.Tests/
COPY tests/backend/LouBarbershop.Application.Tests/*.csproj tests/backend/LouBarbershop.Application.Tests/
COPY tests/backend/LouBarbershop.Architecture.Tests/*.csproj tests/backend/LouBarbershop.Architecture.Tests/
COPY tests/backend/LouBarbershop.Integration.Tests/*.csproj tests/backend/LouBarbershop.Integration.Tests/
RUN dotnet restore LouBarbershop.slnx

COPY src/backend src/backend
RUN dotnet publish src/backend/LouBarbershop.Api/LouBarbershop.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.11-alpine3.24 AS runtime
RUN apk upgrade --no-cache \
    && apk add --no-cache curl krb5-libs
WORKDIR /app
COPY --from=build /app/publish .
ENV DOTNET_EnableDiagnostics=0
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "LouBarbershop.Api.dll"]
