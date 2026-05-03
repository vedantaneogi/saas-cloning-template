"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import {
  authEndpoints,
  fetchAuthConfig,
  loginWithTestUser,
  type AuthConfig,
} from "../api";
import { AUTH_QUERY_KEY } from "../hooks";

const AUTH_CONFIG_QUERY_KEY = ["auth", "config"] as const;

export function SignInCard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const configQuery = useQuery<AuthConfig, Error>({
    queryKey: AUTH_CONFIG_QUERY_KEY,
    queryFn: fetchAuthConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const testLoginMutation = useMutation({
    mutationFn: loginWithTestUser,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      router.replace("/");
      router.refresh();
    },
  });

  const testAuthEnabled = configQuery.data?.test_auth_enabled === true;
  const testLoginError = testLoginMutation.isError
    ? (testLoginMutation.error as Error).message
    : null;

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "#e8f0fe",
                color: "#1a73e8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Sign in to Slides
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Continue with Google to access your decks.
            </Typography>
          </Stack>

          <Button
            component="a"
            href={authEndpoints.login}
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              bgcolor: "#1a73e8",
              "&:hover": { bgcolor: "#0b57d0" },
            }}
            fullWidth
          >
            Continue with Google
          </Button>

          {configQuery.isLoading && (
            <Stack sx={{ alignItems: "center", py: 1 }}>
              <CircularProgress size={18} />
            </Stack>
          )}

          {testAuthEnabled && (
            <>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  Local development only
                </Typography>
              </Divider>
              <Stack spacing={1}>
                <Button
                  onClick={() => testLoginMutation.mutate()}
                  disabled={testLoginMutation.isPending}
                  variant="outlined"
                  size="large"
                  startIcon={<BugReportRoundedIcon />}
                  sx={{ textTransform: "none", fontWeight: 500 }}
                  fullWidth
                >
                  {testLoginMutation.isPending
                    ? "Signing in..."
                    : "Continue as test user"}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Bypasses Google OAuth. Visible only when TEST_AUTH_ENABLED=true.
                </Typography>
              </Stack>
            </>
          )}

          {testLoginError && (
            <Alert severity="error">{testLoginError}</Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
