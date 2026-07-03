import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { login, bootstrap, checkSetupRequired } from './Services';

const loginSchema = Yup.object({
    username: Yup.string().trim().required('Username is required'),
    password: Yup.string().required('Password is required'),
});

const setupSchema = Yup.object({
    groupName: Yup.string().trim().required('Company / group name is required'),
    fullName: Yup.string().trim().required('Your full name is required'),
    username: Yup.string().trim().required('Choose a username').min(3),
    password: Yup.string().required('Choose a password').min(8, 'At least 8 characters'),
});

export default function Login({ onAuthenticated }) {
    const [setupRequired, setSetupRequired] = useState(null);
    const [setupJustCompleted, setSetupJustCompleted] = useState(false);

    useEffect(() => {
        checkSetupRequired().then((res) => {
            setSetupRequired(res?.setupRequired ?? false);
        });
    }, []);

    if (setupRequired === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const isSetupMode = setupRequired && !setupJustCompleted;

    const handleLogin = async (values, { setSubmitting, setStatus }) => {
        const response = await login(values);
        setSubmitting(false);
        if (response?.status) {
            localStorage.setItem('token', response.data.token);
            onAuthenticated();
        } else {
            setStatus(response?.message ?? 'Login failed.');
        }
    };

    const handleSetup = async (values, { setSubmitting, setStatus }) => {
        const response = await bootstrap(values);
        setSubmitting(false);
        if (response?.status) {
            setSetupJustCompleted(true);
        } else {
            setStatus(response?.message ?? 'Setup failed.');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#4A2E1B',
                px: 2,
            }}
        >
            <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
                <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', mb: 0.5 }}>
                    Leather POS &amp; Accounting
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {isSetupMode ? 'First-time setup - create your company and admin account' : 'Sign in to continue'}
                </Typography>

                {isSetupMode ? (
                    <Formik
                        initialValues={{ groupName: '', fullName: '', username: '', password: '' }}
                        validationSchema={setupSchema}
                        onSubmit={handleSetup}
                    >
                        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                            <Form>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {status && <Alert severity="error">{status}</Alert>}
                                    <TextField
                                        label="Company / Group Name"
                                        name="groupName"
                                        value={values.groupName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.groupName && !!errors.groupName}
                                        helperText={touched.groupName && errors.groupName}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Your Full Name"
                                        name="fullName"
                                        value={values.fullName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.fullName && !!errors.fullName}
                                        helperText={touched.fullName && errors.fullName}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Username"
                                        name="username"
                                        value={values.username}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.username && !!errors.username}
                                        helperText={touched.username && errors.username}
                                        fullWidth
                                    />
                                    <TextField
                                        type="password"
                                        label="Password"
                                        name="password"
                                        value={values.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.password && !!errors.password}
                                        helperText={touched.password && errors.password}
                                        fullWidth
                                    />
                                    <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                                        Create Account &amp; Continue
                                    </Button>
                                </Box>
                            </Form>
                        )}
                    </Formik>
                ) : (
                    <Formik
                        initialValues={{ username: '', password: '' }}
                        validationSchema={loginSchema}
                        onSubmit={handleLogin}
                    >
                        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                            <Form>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {status && <Alert severity="error">{status}</Alert>}
                                    {setupJustCompleted && (
                                        <Alert severity="success">Account created - please sign in.</Alert>
                                    )}
                                    <TextField
                                        label="Username"
                                        name="username"
                                        value={values.username}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.username && !!errors.username}
                                        helperText={touched.username && errors.username}
                                        fullWidth
                                        autoFocus
                                    />
                                    <TextField
                                        type="password"
                                        label="Password"
                                        name="password"
                                        value={values.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.password && !!errors.password}
                                        helperText={touched.password && errors.password}
                                        fullWidth
                                    />
                                    <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                                        Sign In
                                    </Button>
                                </Box>
                            </Form>
                        )}
                    </Formik>
                )}
            </Paper>
        </Box>
    );
}
